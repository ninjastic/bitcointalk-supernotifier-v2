import { Request, Response } from 'express';
import { container } from 'tsyringe';

import PostSearchService from '../services/PostSearchService';

export default class PostSearchController {
  public async show(request: Request, response: Response): Promise<Response> {
    const { q, limit } = request.query;

    const postSearch = container.resolve(PostSearchService);

    const posts = await postSearch.execute(String(q), Number(limit));

    return response.json(posts);
  }
}
