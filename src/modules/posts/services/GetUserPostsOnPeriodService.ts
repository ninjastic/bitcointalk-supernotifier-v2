import { container } from 'tsyringe';
import { ApiResponse } from '@elastic/elasticsearch';

import esClient from '../../../shared/services/elastic';

import GetCacheService from '../../../shared/container/providers/services/GetCacheService';
import SaveCacheService from '../../../shared/container/providers/services/SaveCacheService';

interface GetUserPostsOnPeriodParams {
  from: string;
  to: string;
  interval: string;
}

export default class GetUserPostsOnPeriodService {
  public async execute(
    username: string,
    { from, to, interval }: GetUserPostsOnPeriodParams,
  ): Promise<ApiResponse> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute<ApiResponse>(
      `userPostsOnPeriod:${username}:${from}-${to}-${interval}`,
    );

    if (cachedData) {
      return cachedData;
    }

    const results = await esClient.search({
      index: 'posts',
      scroll: '1m',
      _source: ['author', 'author_uid'],
      size: 1,
      body: {
        size: 1,
        _source: ['author', 'author_uid'],
        query: {
          bool: {
            must: [
              {
                match_phrase: {
                  author: username,
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

    await saveCache.execute(
      `userPostsOnPeriod:${username}:${from}-${to}-${interval}`,
      results,
      'EX',
      180,
    );

    return results;
  }
}
