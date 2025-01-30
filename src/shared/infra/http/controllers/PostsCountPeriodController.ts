import { Request, Response } from 'express';
import { sub, startOfHour, endOfHour, addMinutes } from 'date-fns';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetPostsCountPeriodService, { GetPostsCountPeriodParams } from '../services/GetPostsCountPeriodService';

export default class PostsCountPeriodController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPostsDataOnPeriod = new GetPostsCountPeriodService();

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
      interval: interval || '1h'
    };

    const schemaValidation = Joi.object({
      from: Joi.string().isoDate().allow('', null),
      to: Joi.string().isoDate().allow('', null),
      interval: Joi.string()
        .regex(/^\d{0,3}(m|h|d|w|M)$/)
        .allow('', null)
    });

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
      const data = await getPostsDataOnPeriod.execute(query as GetPostsCountPeriodParams);

      const result = {
        result: 'success',
        message: null,
        data
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error,
        controller: 'PostsCountPeriodController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
