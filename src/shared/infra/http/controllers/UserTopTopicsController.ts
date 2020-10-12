import { Request, Response } from 'express';
import { sub, startOfHour, endOfHour, addMinutes } from 'date-fns';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetUserTopTopicsService from '../services/GetUserTopTopicsService';

export default class UserTopTopicsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserTopTopics = new GetUserTopTopicsService();

    const params = (request.params as unknown) as {
      username: string;
    };

    const query = (request.query as unknown) as {
      from: string;
      to: string;
    };

    const date = new Date();
    const dateUTC = addMinutes(date, date.getTimezoneOffset());

    const defaultFrom = startOfHour(sub(dateUTC, { years: 1 })).toISOString();
    const defaultTo = endOfHour(sub(dateUTC, { hours: 1 })).toISOString();

    const schemaValidation = Joi.object({
      username: Joi.string().required(),
      from: Joi.string().isoDate().allow('', null),
      to: Joi.string().isoDate().allow('', null),
      interval: Joi.string().allow('', null),
    });

    const settings = {
      username: params.username,
      from: query.from || defaultFrom,
      to: query.to || defaultTo,
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
      const data = await getUserTopTopics.execute(settings);

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on UserTopTopicsController',
      );
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
