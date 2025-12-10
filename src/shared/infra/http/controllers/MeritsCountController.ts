import type { AggregationsCalendarInterval } from '@elastic/elasticsearch/lib/api/types';
import type { Request, Response } from 'express';

import { addMinutes, endOfHour, startOfHour, sub } from 'date-fns';
import Joi from 'joi';

import logger from '../../../services/logger';
import GetMeritsCountService from '../services/GetMeritsCountService';

export default class MeritsCountController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getMeritsCount = new GetMeritsCountService();

    const date = new Date();
    const dateUTC = addMinutes(date, date.getTimezoneOffset());

    const { from, to, interval } = request.query as {
      from: string;
      to: string;
      interval: string;
    };

    const query = {
      from: from || startOfHour(sub(dateUTC, { days: 1 })).toISOString(),
      to: to || endOfHour(sub(dateUTC, { hours: 1 })).toISOString(),
      interval: (interval || '1h') as AggregationsCalendarInterval,
    };

    const schemaValidation = Joi.object({
      from: Joi.string().isoDate().allow('', null),
      to: Joi.string().isoDate().allow('', null),
      interval: Joi.string()
        .regex(/^\d{0,3}([mhdwM])$/)
        .allow('', null),
    });

    try {
      await schemaValidation.validateAsync(query);
    }
    catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    try {
      const data = await getMeritsCount.execute(query);

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
        controller: 'MeritsCountController',
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
