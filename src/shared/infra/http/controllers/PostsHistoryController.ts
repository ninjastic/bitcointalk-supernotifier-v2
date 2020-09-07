import { container } from 'tsyringe';
import { Request, Response } from 'express';

import GetPostsHistoryByPostIdService from '../../../../modules/posts/services/GetPostsHistoryByPostIdService';

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
}
