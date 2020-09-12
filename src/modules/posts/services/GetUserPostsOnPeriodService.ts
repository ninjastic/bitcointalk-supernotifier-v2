import { ApiResponse } from '@elastic/elasticsearch';

import esClient from '../../../shared/services/elastic';

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

    return results;
  }
}
