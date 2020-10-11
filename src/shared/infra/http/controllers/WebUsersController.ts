import { Request, Response } from 'express';
import { container } from 'tsyringe';
import Joi from 'joi';

import GetWebUserService from '../../../../modules/web/services/GetWebUserService';
import GetWebNotificationsService from '../../../../modules/web/services/GetWebNotificationsService';
import CreateWebUserService from '../../../../modules/web/services/CreateWebUserService';

export default class WebUsersRepository {
  public async index(request: Request, response: Response): Promise<Response> {
    const getWebNotifications = container.resolve(GetWebNotificationsService);

    const user_id = String(request.params.user_id);

    const schemaValidation = Joi.object({
      user_id: Joi.string().uuid().required(),
    });

    try {
      await schemaValidation.validateAsync({ user_id });
    } catch (error) {
      return response.json({
        result: 'error',
        message: error.details[0].message,
        data: null,
      });
    }

    const data = await getWebNotifications.execute(user_id);

    return response.json({
      result: 'success',
      data,
    });
  }

  public async create(request: Request, response: Response): Promise<Response> {
    const createWebUser = container.resolve(CreateWebUserService);

    const { user_id, username } = request.body;

    const schemaValidation = Joi.object({
      user_id: Joi.number().required(),
      username: Joi.string().required(),
    });

    try {
      await schemaValidation.validateAsync({ user_id, username });
    } catch (error) {
      return response.json({
        result: 'error',
        message: error.details[0].message,
        data: null,
      });
    }

    const getWebUserService = container.resolve(GetWebUserService);
    const existentWebUser = await getWebUserService.execute(username);

    if (existentWebUser) {
      return response.json({
        result: 'success',
        data: existentWebUser,
      });
    }

    const createdWebUser = await createWebUser.execute({
      user_id,
      username: username.toLowerCase(),
    });

    return response.json({
      result: 'success',
      data: createdWebUser,
    });
  }
}
