import { Request, Response } from 'express';
import { container } from 'tsyringe';

import PostSearchService from '../services/PostSearchService';

import IFindPostsConditionsDTO from '../../../../modules/posts/dtos/IFindPostsConditionsDTO';

export default class PostSearchController {
  public async show(request: Request, response: Response): Promise<Response> {
    const { author, content, limit, topic_id, last } = request.query;

    const postSearch = container.resolve(PostSearchService);

    const query = {} as IFindPostsConditionsDTO;

    if (author) {
      query.author = String(author);
    }

    if (content) {
      query.content = String(content);
    }

    if (last) {
      query.last = Number(last);
    }

    if (topic_id) {
      query.topic_id = Number(topic_id);
    }

    const posts = await postSearch.execute(query, Number(limit));

    return response.json(posts);
  }
}
