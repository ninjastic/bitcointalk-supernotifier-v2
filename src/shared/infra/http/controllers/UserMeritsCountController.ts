import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetUserMeritCountOnPeriodService from '../../../../modules/merits/services/GetUserMeritCountOnPeriodService';

export default class UserMeritsCountController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserMeritCountOnPeriod = container.resolve(
      GetUserMeritCountOnPeriodService,
    );

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

    try {
      const data = await getUserMeritCountOnPeriod.execute({
        username: request.params.username,
      });

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack,
        controller: 'UserMeritsDataController',
      });
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
