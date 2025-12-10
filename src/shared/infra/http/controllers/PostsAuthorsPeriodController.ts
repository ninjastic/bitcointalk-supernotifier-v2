import type { Request, Response } from 'express';

import { addMinutes, endOfHour, startOfHour, sub } from 'date-fns';
import Joi from 'joi';

import logger from '../../../services/logger';
import GetPostsAuthorsPeriodService from '../services/GetPostsAuthorsPeriodService';

export default class PostsAuthorsPeriodController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPostsAuthorsPeriod = new GetPostsAuthorsPeriodService();

    const query = request.query as unknown as {
      from: string;
      to: string;
    };

    const date = new Date();
    const dateUTC = addMinutes(date, date.getTimezoneOffset());

    const defaultFrom = startOfHour(sub(dateUTC, { days: 1, hours: 1 })).toISOString();
    const defaultTo = endOfHour(sub(dateUTC, { hours: 1 })).toISOString();

    const schemaValidation = Joi.object({
      from: Joi.string().isoDate().allow('', null),
      to: Joi.string().isoDate().allow('', null),
    });

    const settings = {
      from: query.from || defaultFrom,
      to: query.to || defaultTo,
    };

    try {
      await schemaValidation.validateAsync(settings);
    }
    catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    try {
      const data = await getPostsAuthorsPeriod.execute(settings);

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    }
    catch (error) {
      logger.error({
        error,
        controller: 'PostsAuthorsPeriodController',
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
