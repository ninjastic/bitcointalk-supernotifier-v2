import { container } from 'tsyringe';
import { Request, Response } from 'express';

import logger from '../../../services/logger';

import GetPostService from '../../../../modules/posts/services/GetPostService';
import GetPostsFromListService from '../../../../modules/posts/services/GetPostsFromListService';
import GetBoardNameFromIdService from '../../../../modules/posts/services/GetBoardNameFromIdService';
import PostSearchService from '../services/PostSearchService';

export default class PostsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPost = container.resolve(GetPostService);
    const getPostsFromList = container.resolve(GetPostsFromListService);
    const getBoardNameFromId = container.resolve(GetBoardNameFromIdService);

    const { ids } = request.params;

    if (ids.match(/\d+,/)) {
      const posts_id = ids.split(',').map(id => Number(id));

      if (posts_id.some(Number.isNaN)) {
        return response.status(400).json({ error: 'id list is invalid' });
      }

      const posts = await getPostsFromList.execute(posts_id);

      if (!posts.body.hits.hits.length) {
        return response.status(404).json({ error: 'Not found' });
      }

      return response.json(posts.body.hits.hits);
    }

    if (Number.isNaN(Number(ids))) {
      return response.status(400).json({ error: 'id is invalid' });
    }

    try {
      const post = await getPost.execute(
        { post_id: Number(ids) },
        { skipScraping: true },
      );

      if (post.board_id) {
        const boardName = await getBoardNameFromId.execute(post.board_id);
        return response.json({ ...post, board_name: boardName });
      }

      return response.json({ ...post });
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack });
      return response.status(404).json({ error: 'Not found' });
    }
  }

  public async index(request: Request, response: Response): Promise<Response> {
    const {
      author,
      content,
      last,
      after,
      topic_id,
      board,
      after_date,
      before_date,
      order,
    } = request.query;

    const limit = Number(request.query.limit);

    const postSearch = container.resolve(PostSearchService);

    const query = {
      author: author ? String(author) : undefined,
      content: content ? String(content) : undefined,
      topic_id: topic_id ? Number(topic_id) : undefined,
      last: last ? Number(last) : undefined,
      after: after ? Number(after) : undefined,
      board: board ? Number(board) : undefined,
      after_date: after_date ? String(after_date) : undefined,
      before_date: before_date ? String(before_date) : undefined,
    };

    const queryOrder = order ? (String(order) as 'ASC' | 'DESC') : undefined;

    try {
      if (topic_id && Number.isNaN(Number(topic_id))) {
        throw new Error('topic_id is invalid');
      }

      if (last && Number.isNaN(Number(last))) {
        throw new Error('last is invalid');
      }

      if (after && Number.isNaN(Number(after))) {
        throw new Error('after is invalid');
      }

      if (board && Number.isNaN(Number(board))) {
        throw new Error('board is invalid');
      }

      const posts = await postSearch.execute(query, limit, queryOrder);

      delete posts.body._shards;

      return response.json(posts.body);
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack });
      return response.status(400).json({ error: 'Something went wrong...' });
    }
  }
}
