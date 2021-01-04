import { container } from 'tsyringe';

import esClient from '../../../shared/services/elastic';

import GetCacheService from '../../../shared/container/providers/services/GetCacheService';
import SaveCacheService from '../../../shared/container/providers/services/SaveCacheService';

interface Params {
  author_uid: number;
  from: string;
  to: string;
  interval: string;
}

interface Data {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export default class GetUserPostsOnPeriodService {
  public async execute({
    author_uid,
    from,
    to,
    interval,
  }: Params): Promise<Data> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute<Data>(
      `userPostsOnPeriod:${author_uid}:${from}-${to}-${interval}`,
    );

    if (cachedData) {
      return cachedData;
    }

    const results = await esClient.search({
      index: 'posts',
      _source: ['author', 'author_uid'],
      track_total_hits: true,
      size: 1,
      body: {
        size: 1,
        _source: ['author', 'author_uid'],
        query: {
          bool: {
            must: [
              {
                match: {
                  author_uid,
                },
              },
              {
                range: {
                  date: {
                    from,
                    to,
                  },
                },
              },
            ],
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
              calendar_interval: interval,
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
      `userPostsOnPeriod:${author_uid}:${from}-${to}-${interval}`,
      data,
      'EX',
      180,
    );

    return data;
  }
}
