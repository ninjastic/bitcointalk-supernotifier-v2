import { container } from 'tsyringe';
import { ApiResponse } from '@elastic/elasticsearch';
import { getManager } from 'typeorm';

import esClient from '../../../shared/services/elastic';

import GetCacheService from '../../../shared/container/providers/services/GetCacheService';
import SaveCacheService from '../../../shared/container/providers/services/SaveCacheService';

export default class GetUserPostsDataService {
  public async execute(username: string): Promise<ApiResponse> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute<ApiResponse>(
      `userPostsData:${username}`,
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
              field: 'board_id',
            },
          },
        },
      },
    });

    const boardsData = results.body.aggregations.boards.buckets;

    const boards = await Promise.all(
      boardsData.map(async board => {
        const query = await getManager().query(
          'WITH RECURSIVE child_board AS (SELECT board_id, name, parent_id FROM boards where board_id = $1 UNION SELECT b.board_id, b.name, b.parent_id FROM boards b INNER JOIN child_board c ON b.parent_id = c.board_id ) SELECT * FROM child_board',
          [board.key],
        );

        const { name } = query[0];

        return { name, count: board.doc_count };
      }),
    );

    const data = {
      ...results,
      body: {
        ...results.body,
        aggregations: {
          boards: {
            sum_other_doc_count:
              results.body.aggregations.boards.sum_other_doc_count,
            buckets: boards,
          },
        },
      },
    };

    await saveCache.execute(`userPostsData:${username}`, data, 'EX', 180);

    return data;
  }
}
