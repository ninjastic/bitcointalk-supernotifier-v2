import { Request, Response } from 'express';

import logger from '../../../services/logger';

import GetUserPostsDataService from '../../../../modules/posts/services/GetUserPostsDataService';

export default class UserPostsBoardsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserPostsData = new GetUserPostsDataService();

    const { username } = request.params;

    const { from, to } = request.query as {
      from: string;
      to: string;
    };

    try {
      const data = await getUserPostsData.execute(
        username,
        from || undefined,
        to || undefined,
      );

      return response.json(data);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on UserPostsBoardsController',
      );
      return response
        .status(400)
        .json({ result: 400, error: 'Something went wrong' });
    }
  }
}
