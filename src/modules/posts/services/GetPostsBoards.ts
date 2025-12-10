import { container } from 'tsyringe';
import { getManager } from 'typeorm';

import GetCacheService from '../../../shared/container/providers/services/GetCacheService';
import SaveCacheService from '../../../shared/container/providers/services/SaveCacheService';
import esClient from '../../../shared/services/elastic';

interface Params {
  author_uid: number;
  from: string;
  to: string;
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

export default class GetPostsBoardsService {
  public async execute({ author_uid, from, to }: Params): Promise<Data> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute<Data>(`postsBoardsData:${from}:${to}`);

    if (cachedData) {
      return cachedData;
    }

    const results = await esClient.search({
      index: 'posts',
      track_total_hits: true,
      size: 1,
      query: {
        bool: {
          must: [
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
        boards: {
          terms: {
            field: 'board_id',
            size: 300,
          },
        },
      },
    });

    const boardsData = (results.aggregations.boards as any).buckets;

    const boards = await Promise.all(
      boardsData.map(async (board) => {
        const cachedBoardsData = await getCache.execute(`boardsRecursive:${board.key}:${author_uid}:${from}:${to}`);

        if (cachedBoardsData) {
          return cachedBoardsData;
        }

        const query = await getManager().query(
          'WITH RECURSIVE child_board AS (SELECT board_id, name, parent_id FROM boards where board_id = $1 UNION SELECT b.board_id, b.name, b.parent_id FROM boards b INNER JOIN child_board c ON b.parent_id = c.board_id ) SELECT * FROM child_board',
          [board.key],
        );

        const { name } = query[0];
        const data = { name, key: board.key, count: board.doc_count };

        await saveCache.execute(`boardsRecursive:${board.key}:${author_uid}:${from}:${to}`, data, 'EX', 604800);

        return data;
      }),
    );

    const organized = {
      hits: results.hits,
      aggregations: {
        boards: {
          sum_other_doc_count: (results.aggregations.boards as any).sum_other_doc_count,
          buckets: boards,
        },
      },
    };

    const posts_count_with_boards = organized.aggregations.boards.buckets.reduce(
      (accum: number, curr: { count: number }) => accum + curr.count,
      0,
    );

    const data = {
      total_results: (organized.hits.total as { value: number }).value,
      total_results_with_board: posts_count_with_boards + organized.aggregations.boards.sum_other_doc_count,
      boards: organized.aggregations.boards.buckets,
    } as unknown as Data;

    await saveCache.execute(`postsBoardsData:${from}:${to}`, data, 'EX', 180);

    return data;
  }
}
