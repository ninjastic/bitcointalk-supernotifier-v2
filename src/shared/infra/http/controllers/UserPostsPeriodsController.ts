import { Request, Response } from 'express';
import { sub, addMinutes, startOfDay, endOfDay } from 'date-fns';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetUserPostsOnPeriodService from '../../../../modules/posts/services/GetUserPostsOnPeriodService';

export default class UserPostsPeriodsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserPostsOnPeriod = new GetUserPostsOnPeriodService();

    const params = (request.params as unknown) as {
      username: string;
    };

    const query = (request.query as unknown) as {
      from: string;
      to: string;
      interval: string;
    };

    const schemaValidation = Joi.object({
      username: Joi.string().required(),
      from: Joi.string().isoDate().allow('', null),
      to: Joi.string().isoDate().allow('', null),
      interval: Joi.string()
        .regex(/^\d{0,3}(d|h|m)$/)
        .allow('', null),
    });

    const date = new Date();
    const dateUTC = addMinutes(date, date.getTimezoneOffset());

    const defaultFrom = sub(startOfDay(dateUTC), { days: 6 }).toISOString();
    const defaultTo = endOfDay(dateUTC).toISOString();

    const settings = {
      username: params.username,
      from: query.from || defaultFrom,
      to: query.to || defaultTo,
      interval: query.interval || '1d',
    };

    try {
      await schemaValidation.validateAsync(settings);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    try {
      const data = await getUserPostsOnPeriod.execute(settings);

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on UserPostsPeriodsController',
      );
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
