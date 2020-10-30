import { Request as ExpressRequest, Response } from 'express';
import { sub, endOfHour, addMinutes } from 'date-fns';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetUserTopTopicsService from '../services/GetUserTopTopicsService';

interface Request extends ExpressRequest {
  query: {
    from: string;
    to: string;
  };
}

export default class UserTopTopicsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserTopTopics = new GetUserTopTopicsService();
    const date = new Date();
    const dateUTC = addMinutes(date, date.getTimezoneOffset());

    const defaultTo = endOfHour(sub(dateUTC, { hours: 1 })).toISOString();

    const schemaValidation = Joi.object({
      author_uid: Joi.number().required(),
      from: Joi.string().isoDate().allow('', null),
      to: Joi.string().isoDate().allow('', null),
    });

    const query = {
      author_uid: request.author_uid,
      from: request.query.from || null,
      to: request.query.to || defaultTo,
    };

    try {
      await schemaValidation.validateAsync(query);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    try {
      const data = await getUserTopTopics.execute(query);

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
        controller: 'UserTopTopicsController',
      });
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
