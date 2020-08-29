import { container } from 'tsyringe';
import { Request, Response } from 'express';

import P from 'pino';
import GetPostService from '../../../../modules/posts/services/GetPostService';

export default class PostController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPost = container.resolve(GetPostService);

    const { id } = request.params;

    try {
      const post = await getPost.execute(Number(id));

      delete post.id;
      delete post.notified;
      delete post.notified_to;
      delete post.checked;
      delete post.created_at;
      delete post.updated_at;

      return response.json(post);
    } catch (error) {
      return response.status(404).json();
    }
  }
}
