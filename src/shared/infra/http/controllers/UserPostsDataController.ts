import { Request, Response } from 'express';

import logger from '../../../services/logger';

import GetUserPostsDataService from '../../../../modules/posts/services/GetUserPostsDataService';

export default class UserPostsDataController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserPostsData = new GetUserPostsDataService();

    const { username } = request.params;

    const { from, to } = request.query as {
      from: string;
      to: string;
    };

    try {
      const data = await getUserPostsData.execute(
        username,
        from || undefined,
        to || undefined,
      );

      if (!data.body.hits.hits[0]) {
        return response.json({ error: 'Not found' });
      }

      const total_boards = data.body.aggregations.boards.buckets.reduce(
        (accum, curr) => {
          return accum + curr.count;
        },
        0,
      );

      const results = {
        user: {
          author: data.body.hits.hits[0]._source.author,
          author_uid: data.body.hits.hits[0]._source.author_uid,
        },
        posts_count: data.body.hits.total.value,
        total_boards:
          total_boards + data.body.aggregations.boards.sum_other_doc_count,
        boards: data.body.aggregations.boards.buckets,
      };

      return response.json(results);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on UserPostsDataController',
      );
      return response.status(400).json({ error: 'Something went wrong' });
    }
  }
}
