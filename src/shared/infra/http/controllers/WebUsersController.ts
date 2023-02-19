import { Request, Response } from 'express';
import { container } from 'tsyringe';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetWebUserService from '../../../../modules/web/services/GetWebUserService';
import CreateWebUserService from '../../../../modules/web/services/CreateWebUserService';

export default class WebUsersRepository {
  public async create(request: Request, response: Response): Promise<Response> {
    const createWebUser = container.resolve(CreateWebUserService);

    const { user_id, username } = request.body;

    const schemaValidation = Joi.object({
      user_id: Joi.number().required(),
      username: Joi.string().required()
    });

    try {
      await schemaValidation.validateAsync({ user_id, username });
    } catch (error) {
      return response.json({
        result: 'error',
        message: error.details[0].message,
        data: null
      });
    }

    try {
      const getWebUserService = container.resolve(GetWebUserService);
      const existentWebUser = await getWebUserService.execute({
        username: username.toLowerCase(),
        user_id
      });

      if (existentWebUser) {
        return response.json({
          result: 'success',
          message: null,
          data: existentWebUser
        });
      }

      const createdWebUser = await createWebUser.execute({
        user_id,
        username: username.toLowerCase()
      });

      return response.json({
        result: 'success',
        message: null,
        data: createdWebUser
      });
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack,
        controller: 'WebUsersController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
