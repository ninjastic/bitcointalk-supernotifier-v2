import type { Request, Response } from 'express';

import Joi from 'joi';
import { container } from 'tsyringe';

import GetCacheService from '../../../container/providers/services/GetCacheService';
import SaveCacheService from '../../../container/providers/services/SaveCacheService';
import logger from '../../../services/logger';

export default class AlertsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getCache = container.resolve(GetCacheService);

    const alert = await getCache.execute('alertMessage');

    const data = {
      result: 'success',
      message: null,
      data: alert,
    };

    return response.json(data);
  }

  public async create(request: Request, response: Response): Promise<Response> {
    const saveCache = container.resolve(SaveCacheService);

    const body = request.body as {
      message: string;
    };

    const schemaValidation = Joi.object({
      message: Joi.string().allow('', null),
    });

    try {
      await schemaValidation.validateAsync(body);
    }
    catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    try {
      await saveCache.execute('alertMessage', body.message);

      const data = {
        result: 'success',
        message: null,
        data: body.message,
      };

      return response.json(data);
    }
    catch (error) {
      logger.error({
        error,
        controller: 'AlertsController',
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
