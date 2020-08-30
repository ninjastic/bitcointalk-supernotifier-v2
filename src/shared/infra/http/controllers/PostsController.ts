import { container } from 'tsyringe';
import { Request, Response } from 'express';

import GetPostService from '../../../../modules/posts/services/GetPostService';
import GetPostsFromListService from '../../../../modules/posts/services/GetPostsFromListService';

export default class PostsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPost = container.resolve(GetPostService);
    const getPostsFromList = container.resolve(GetPostsFromListService);

    const { ids } = request.params;

    if (ids.match(/\d+,/)) {
      const posts_id = ids.split(',').map(id => Number(id));

      const addresses = await getPostsFromList.execute(posts_id);

      if (!addresses.length) {
        return response.status(404).json({ error: 'Not found' });
      }

      return response.json(addresses);
    }

    try {
      const post = await getPost.execute(Number(ids));

      return response.json(post);
    } catch (error) {
      return response.status(404).json({ error: 'Not found' });
    }
  }
}
