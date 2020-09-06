import { container } from 'tsyringe';
import { Request, Response } from 'express';

import IFindPostsConditionsDTO from '../../../../modules/posts/dtos/IFindPostsConditionsDTO';

import GetPostService from '../../../../modules/posts/services/GetPostService';
import GetPostsFromListService from '../../../../modules/posts/services/GetPostsFromListService';
import PostSearchService from '../services/PostSearchService';

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
      const post = await getPost.execute(
        { post_id: Number(ids) },
        { skipScraping: true },
      );

      return response.json(post);
    } catch (error) {
      return response.status(404).json({ error: 'Not found' });
    }
  }

  public async index(request: Request, response: Response): Promise<Response> {
    const {
      author,
      content,
      limit,
      last,
      after,
      topic_id,
      after_date,
      before_date,
    } = request.query;

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

    if (after) {
      query.after = Number(after);
    }

    if (topic_id) {
      query.topic_id = Number(topic_id);
    }

    if (after_date) {
      query.after_date = String(after_date);
    }

    if (before_date) {
      query.before_date = String(before_date);
    }

    const posts = await postSearch.execute(query, Number(limit));

    return response.json(posts);
  }
}
