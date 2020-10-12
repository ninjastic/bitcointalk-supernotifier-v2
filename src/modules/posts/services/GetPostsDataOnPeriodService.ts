import { container } from 'tsyringe';

import esClient from '../../../shared/services/elastic';

import GetCacheService from '../../../shared/container/providers/services/GetCacheService';
import SaveCacheService from '../../../shared/container/providers/services/SaveCacheService';

interface GetPostsDataOnPeriodParams {
  from: string;
  to: string;
  interval: string;
}

export default class GetPostsDataOnPeriodService {
  public async execute({
    from,
    to,
    interval,
  }: GetPostsDataOnPeriodParams): Promise<any> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute(
      `postsDataOnPeriod:${from}-${to}-${interval}`,
    );

    if (cachedData) {
      return cachedData;
    }

    const results = await esClient.search({
      index: 'posts',
      track_total_hits: true,
      size: 0,
      body: {
        size: 0,
        query: {
          range: {
            date: {
              from,
              to,
            },
          },
        },
        aggs: {
          posts: {
            value_count: {
              field: 'post_id',
            },
          },
          date: {
            date_histogram: {
              field: 'date',
              fixed_interval: interval,
              extended_bounds: {
                min: from,
                max: to,
              },
            },
          },
        },
      },
    });

    const data = results.body.aggregations.date.buckets;

    await saveCache.execute(
      `postsDataOnPeriod:${from}-${to}-${interval}`,
      data,
      'EX',
      180,
    );

    return data;
  }
}
