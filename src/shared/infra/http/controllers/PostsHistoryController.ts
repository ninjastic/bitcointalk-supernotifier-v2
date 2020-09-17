import { container } from 'tsyringe';
import { Request, Response } from 'express';

import logger from '../../../services/logger';

import GetPostsHistoryByPostIdService from '../../../../modules/posts/services/GetPostsHistoryByPostIdService';
import GetLatestPostHistoryService from '../../../../modules/posts/services/GetLatestPostHistoryService';

export default class PostsHistoryController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPostsHistoryByPostId = container.resolve(
      GetPostsHistoryByPostIdService,
    );

    const { id } = request.params;

    const postHistory = await getPostsHistoryByPostId.execute(Number(id));

    if (!postHistory) {
      return response.status(404).json({ error: 'Not found' });
    }

    return response.json(postHistory);
  }

  public async index(request: Request, response: Response): Promise<Response> {
    const {
      author,
      topic_id,
      deleted,
      last,
      after,
      board,
      after_date,
      before_date,
    } = request.query;
    const getLatestPostHistory = container.resolve(GetLatestPostHistoryService);

    const limit = Number(request.query.limit);

    const query = {
      author: author ? String(author) : undefined,
      topic_id: topic_id ? Number(topic_id) : undefined,
      last: last ? new Date(String(last)) : undefined,
      board: board ? Number(board) : undefined,
      deleted: deleted ? !!deleted : undefined,
      after_date: after_date ? String(after_date) : undefined,
      before_date: before_date ? String(before_date) : undefined,
    };

    try {
      if (topic_id && Number.isNaN(Number(topic_id))) {
        throw new Error('topic_id is invalid');
      }

      if (board && Number.isNaN(Number(board))) {
        throw new Error('board is invalid');
      }

      const postsHistory = await getLatestPostHistory.execute({
        ...query,
        limit,
      });

      delete postsHistory.body._shards;

      return response.json(postsHistory.body);
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack });
      return response.status(400).json({ error: 'Something went wrong...' });
    }
  }
}
