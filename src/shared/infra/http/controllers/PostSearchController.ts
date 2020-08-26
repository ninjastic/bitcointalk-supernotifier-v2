import { Request, Response } from 'express';
import { container } from 'tsyringe';

import PostSearchService from '../services/PostSearchService';

interface PostSearchQueryDTO {
  author?: string;
  content?: string;
}

export default class PostSearchController {
  public async show(request: Request, response: Response): Promise<Response> {
    const { author, content, limit } = request.query;

    const postSearch = container.resolve(PostSearchService);

    const query = {} as PostSearchQueryDTO;

    if (author) {
      query.author = String(author);
    }

    if (content) {
      query.content = String(content);
    }

    const posts = await postSearch.execute(query, Number(limit));

    return response.json(posts);
  }
}
