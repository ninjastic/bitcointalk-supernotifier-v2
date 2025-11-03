import { container } from 'tsyringe';
import type { Request as ExpressRequest, Response } from 'express';
import { sub, addMinutes, startOfDay, endOfDay } from 'date-fns';
import Joi from 'joi';
import type { AggregationsCalendarInterval } from '@elastic/elasticsearch/lib/api/types';

import logger from '../../../services/logger';

import GetUserMeritCountOnPeriodService from '../../../../modules/merits/services/GetUserMeritCountOnPeriodService';

interface Request extends ExpressRequest {
  query: {
    from: string;
    to: string;
    type: string;
    interval: string;
  };
}

export default class UserMeritsCountController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserMeritCountOnPeriod = container.resolve(GetUserMeritCountOnPeriodService);

    const schemaValidation = Joi.object({
      author_uid: Joi.number().required(),
      from: Joi.string().isoDate().allow('', null),
      to: Joi.string().isoDate().allow('', null),
      type: Joi.string().allow('sender', 'receiver', null).insensitive(),
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
      type: request.query.type || 'receiver',
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
      const data = await getUserMeritCountOnPeriod.execute(query);

      const result = {
        result: 'success',
        message: null,
        data
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error,
        controller: 'UserMeritsDataController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
