import { Request, Response } from 'express';

import logger from '../../../services/logger';

import GetUserInfoService from '../../../../modules/posts/services/GetUserInfoService';

export default class UserInfoController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserInfoService = new GetUserInfoService();

    const { username } = request.params;

    try {
      const data = await getUserInfoService.execute(username);

      return response.json(data);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on UserInfoController',
      );
      return response
        .status(400)
        .json({ result: 400, error: 'Something went wrong' });
    }
  }
}
