import { Request, Response } from 'express';
import { container } from 'tsyringe';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetWebUserService from '../../../../modules/web/services/GetWebUserService';
import GetWebNotificationsService from '../../../../modules/web/services/GetWebNotificationsService';

export default class WebUsersRepository {
  public async index(request: Request, response: Response): Promise<Response> {
    const getWebNotifications = container.resolve(GetWebNotificationsService);

    const schemaValidation = Joi.object({
      user_id: Joi.string().uuid().required()
    });

    try {
      await schemaValidation.validateAsync({ user_id: request.params.user_id });
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
        id: request.params.user_id
      });

      if (!existentWebUser) {
        return response.json({
          result: 'success',
          message: 'User not found',
          data: null
        });
      }

      const data = await getWebNotifications.execute(request.params.user_id);

      return response.json({
        result: 'success',
        message: null,
        data
      });
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack,
        controller: 'WebNotificationsController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
