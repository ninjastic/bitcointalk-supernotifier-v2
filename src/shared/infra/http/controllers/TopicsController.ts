import { container } from 'tsyringe';
import { Request, Response } from 'express';

import logger from '../../../services/logger';

import GetPostsFromTopicIdService from '../../../../modules/posts/services/GetPostsFromTopicIdService';

export default class PostsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPostsFromTopicId = container.resolve(GetPostsFromTopicIdService);

    const id = Number(request.params.id);

    if (Number.isNaN(id)) {
      return response.status(400).json({ error: 'id is invalid' });
    }

    try {
      const posts = await getPostsFromTopicId.execute(id);

      if (!posts.body.hits.hits.length) {
        return response.status(404).json({ error: 'Not found' });
      }

      return response.json(posts.body.hits.hits);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on TopicsController',
      );
      return response.status(400).json({ error: 'Something went wrong' });
    }
  }
}
