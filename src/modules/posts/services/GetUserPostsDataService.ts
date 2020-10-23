import { container } from 'tsyringe';
import { getManager } from 'typeorm';

import esClient from '../../../shared/services/elastic';

import GetCacheService from '../../../shared/container/providers/services/GetCacheService';
import SaveCacheService from '../../../shared/container/providers/services/SaveCacheService';
import GetAuthorInfoService from '../../../shared/infra/http/services/GetAuthorInfoService';

interface Params {
  username: string;
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

export default class GetUserPostsDataService {
  public async execute({ username, from, to }: Params): Promise<Data> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);
    const getAuthorInfo = container.resolve(GetAuthorInfoService);

    const cachedData = await getCache.execute<Data>(
      `userPostsData:${username}:${from}:${to}`,
    );

    if (cachedData) {
      return cachedData;
    }

    const authorInfo = await getAuthorInfo.execute({ username });

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
                match: {
                  author_uid: authorInfo.author_uid,
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

        return { name, key: board.key, count: board.doc_count };
      }),
    );

    const organized = {
      body: {
        hits: results.body.hits,
        aggregations: {
          boards: {
            sum_other_doc_count:
              results.body.aggregations.boards.sum_other_doc_count,
            buckets: boards,
          },
        },
      },
    };

    const posts_count_with_boards = organized.body.aggregations.boards.buckets.reduce(
      (accum: number, curr: { count: number }) => {
        return accum + curr.count;
      },
      0,
    );

    const data = ({
      total_results: organized.body.hits.total.value,
      total_results_with_board:
        posts_count_with_boards +
        organized.body.aggregations.boards.sum_other_doc_count,
      boards: organized.body.aggregations.boards.buckets,
    } as unknown) as Data;

    await saveCache.execute(
      `userPostsData:${username}:${from}:${to}`,
      data,
      'EX',
      180,
    );

    return data;
  }
}
