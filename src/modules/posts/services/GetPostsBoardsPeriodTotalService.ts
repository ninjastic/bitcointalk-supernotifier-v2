import { container } from 'tsyringe';
import { getManager } from 'typeorm';
import esClient from '../../../shared/services/elastic';

import GetCacheService from '../../../shared/container/providers/services/GetCacheService';
import SaveCacheService from '../../../shared/container/providers/services/SaveCacheService';

interface Params {
  from?: string;
  to?: string;
  limit?: number;
}

interface Board {
  name: string;
  key: number;
  count: number;
}

interface Data {
  total_results: number;
  total_results_with_board: number;
  boards: Board[];
}

export default class GetPostsBoardsPeriodTotalService {
  public async execute({ from, to, limit }: Params): Promise<Data> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const results = await esClient.search({
      index: 'posts',
      size: 0,
      track_total_hits: true,
      body: {
        query: {
          bool: {
            must: [
              {
                range: {
                  date: {
                    gte: from,
                    lte: to
                  }
                }
              }
            ]
          }
        },
        aggs: {
          posts: {
            value_count: {
              field: 'post_id'
            }
          },
          boards: {
            terms: {
              field: 'board_id',
              size: limit || 10
            }
          }
        }
      }
    });

    const boardsData = results.body.aggregations.boards.buckets;

    const boards = await Promise.all(
      boardsData.map(async board => {
        const cachedBoardsData = await getCache.execute(`boardsRecursive:${board.key}:${from}:${to}`);

        if (cachedBoardsData) {
          return cachedBoardsData;
        }

        const query = await getManager().query(
          'WITH RECURSIVE child_board AS (SELECT board_id, name, parent_id FROM boards where board_id = $1 UNION SELECT b.board_id, b.name, b.parent_id FROM boards b INNER JOIN child_board c ON b.parent_id = c.board_id ) SELECT * FROM child_board',
          [board.key]
        );

        const { name } = query[0];
        const data = { name, key: board.key, count: board.doc_count };

        await saveCache.execute(`boardsRecursive:${board.key}:${from}:${to}`, data, 'EX', 604800);

        return data;
      })
    );

    const organized = {
      body: {
        hits: results.body.hits,
        aggregations: {
          boards: {
            buckets: boards
          }
        }
      }
    };

    const posts_count = organized.body.aggregations.boards.buckets.reduce(
      (accum: number, curr: { count: number }) => accum + curr.count,
      0
    );

    const data = {
      total_results: posts_count,
      boards: organized.body.aggregations.boards.buckets
    } as unknown as Data;

    return data;
  }
}
