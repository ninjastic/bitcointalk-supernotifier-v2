import { ApiResponse } from '@elastic/elasticsearch';

import esClient from '../../../shared/services/elastic';

export default class GetUserPostsDataService {
  public async execute(username: string): Promise<ApiResponse> {
    const results = await esClient.search({
      index: 'posts',
      scroll: '1m',
      _source: ['author', 'author_uid'],
      size: 1,
      body: {
        query: {
          bool: {
            must: [
              {
                match_phrase: {
                  author: username,
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
          boards: {
            terms: {
              field: 'boards.keyword',
              exclude: [
                'Bitcoin',
                'Economy',
                'Other',
                'Alternate cryptocurrencies',
                'Local',
              ],
            },
          },
        },
      },
    });

    return results;
  }
}
