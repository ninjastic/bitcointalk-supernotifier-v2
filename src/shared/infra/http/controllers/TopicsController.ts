import { container } from 'tsyringe';
import { Request, Response } from 'express';

import GetPostsFromTopicIdService from '../../../../modules/posts/services/GetPostsFromTopicIdService';

export default class PostsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPostsFromTopicId = container.resolve(GetPostsFromTopicIdService);

    const { id } = request.params;

    const posts = await getPostsFromTopicId.execute(Number(id));

    if (!posts.length) {
      return response.status(404).json({ error: 'Not found' });
    }

    return response.json(posts);
  }
}
