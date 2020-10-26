import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetUserInfoService from '../../../../modules/posts/services/GetUserInfoService';

export default class UserInfoController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserInfoService = new GetUserInfoService();

    const schemaValidation = Joi.object({
      username: Joi.string().required(),
    });

    try {
      await schemaValidation.validateAsync(request.params);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    const data = await getUserInfoService.execute({
      username: request.params.username,
    });

    const result = {
      result: 'success',
      message: null,
      data,
    };

    return response.json(result);
  }
}
