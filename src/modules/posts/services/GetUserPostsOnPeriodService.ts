import { container } from 'tsyringe';

import esClient from '../../../shared/services/elastic';

import GetCacheService from '../../../shared/container/providers/services/GetCacheService';
import SaveCacheService from '../../../shared/container/providers/services/SaveCacheService';

interface Data {
  key_as_string: string;
  key: number;
  doc_cound: number;
}

interface Response {
  timed_out: boolean;
  result: number;
  data: Data[];
}

interface Params {
  from: string;
  to: string;
  interval: string;
}

export default class GetUserPostsOnPeriodService {
  public async execute(
    username: string,
    { from, to, interval }: Params,
  ): Promise<Response> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute<Response>(
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
                match: {
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

    const response = {
      timed_out: results.body.timed_out,
      result: 200,
      data: results.body.aggregations.date.buckets,
    };

    await saveCache.execute(
      `userPostsOnPeriod:${username}:${from}-${to}-${interval}`,
      response,
      'EX',
      180,
    );

    return response;
  }
}
