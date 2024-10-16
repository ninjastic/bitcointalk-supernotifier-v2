import { Request as ExpressRequest, Response } from 'express';
import { sub, addMinutes, startOfDay, endOfDay } from 'date-fns';
import Joi from 'joi';
import { AggregationsCalendarInterval } from '@elastic/elasticsearch/lib/api/types';

import logger from '../../../services/logger';

import GetUserPostsOnPeriodService from '../../../../modules/posts/services/GetUserPostsOnPeriodService';

interface Request extends ExpressRequest {
  query: {
    from: string;
    to: string;
    interval: string;
  };
}

export default class UserPostsPeriodsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserPostsOnPeriod = new GetUserPostsOnPeriodService();

    const schemaValidation = Joi.object({
      author_uid: Joi.number().required(),
      from: Joi.string().isoDate().allow('', null),
      to: Joi.string().isoDate().allow('', null),
      interval: Joi.string()
        .regex(/^\d{0,3}(m|h|d|w|M)$/)
        .allow('', null)
    });

    const date = new Date();
    const dateUTC = addMinutes(date, date.getTimezoneOffset());

    const defaultFrom = sub(startOfDay(dateUTC), { days: 6 }).toISOString();
    const defaultTo = endOfDay(dateUTC).toISOString();

    const query = {
      author_uid: request.author_uid,
      from: request.query.from || defaultFrom,
      to: request.query.to || defaultTo,
      interval: (request.query.interval || '1d') as AggregationsCalendarInterval
    };

    try {
      await schemaValidation.validateAsync(query);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null
      });
    }

    try {
      const data = await getUserPostsOnPeriod.execute(query);

      const result = {
        result: 'success',
        message: null,
        data
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack,
        controller: 'UserPostsPeriodsController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
