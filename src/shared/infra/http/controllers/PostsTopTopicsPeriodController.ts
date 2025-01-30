import { Request, Response } from 'express';
import { sub, startOfHour, endOfHour, addMinutes } from 'date-fns';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetPostsTopTopicsPeriodService from '../services/GetPostsTopTopicsPeriodService';

export default class PostsTopTopicsPeriodController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPostsTopTopicsPeriod = new GetPostsTopTopicsPeriodService();

    const date = new Date();
    const dateUTC = addMinutes(date, date.getTimezoneOffset());

    const defaultFrom = startOfHour(sub(dateUTC, { days: 1, hours: 1 })).toISOString();
    const defaultTo = endOfHour(sub(dateUTC, { hours: 1 })).toISOString();

    const schemaValidation = Joi.object({
      from: Joi.string().isoDate().allow('', null),
      to: Joi.string().isoDate().allow('', null)
    });

    const query = {
      from: (request.query.from || defaultFrom) as string,
      to: (request.query.to || defaultTo) as string
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
      const data = await getPostsTopTopicsPeriod.execute(query);

      const result = {
        result: 'success',
        message: null,
        data
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error,
        controller: 'PostsTopTopicsPeriodController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
