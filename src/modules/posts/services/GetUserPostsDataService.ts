import { container } from 'tsyringe';
import { getManager } from 'typeorm';

import esClient from '../../../shared/services/elastic';

import GetCacheService from '../../../shared/container/providers/services/GetCacheService';
import SaveCacheService from '../../../shared/container/providers/services/SaveCacheService';

interface Params {
  username: string;
  from: string;
  to: string;
}

export default class GetUserPostsDataService {
  public async execute({ username, from, to }: Params): Promise<any> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute(
      `userPostsData:${username}:${from}:${to}`,
    );

    if (cachedData) {
      return cachedData;
    }

    const dataUsername = await esClient.search({
      index: 'posts',
      track_total_hits: true,
      _source: ['author', 'author_uid'],
      size: 1,
      body: {
        query: {
          match: {
            author: username,
          },
        },
      },
    });

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
                  author_uid:
                    dataUsername.body.hits.hits[0]?._source.author_uid,
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

    const data = {
      total_results: organized.body.hits.total.value,
      total_results_with_board:
        posts_count_with_boards +
        organized.body.aggregations.boards.sum_other_doc_count,
      boards: organized.body.aggregations.boards.buckets,
    };

    await saveCache.execute(
      `userPostsData:${username}:${from}:${to}`,
      data,
      'EX',
      180,
    );

    return data;
  }
}
