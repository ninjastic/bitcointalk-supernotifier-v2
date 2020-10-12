import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetUserInfoService from '../../../../modules/posts/services/GetUserInfoService';

export default class UserInfoController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserInfoService = new GetUserInfoService();

    const params = (request.params as unknown) as { username: string };

    const schemaValidation = Joi.object({
      username: Joi.string().required(),
    });

    try {
      await schemaValidation.validateAsync(params);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    try {
      const data = await getUserInfoService.execute(params);

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on UserInfoController',
      );
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
