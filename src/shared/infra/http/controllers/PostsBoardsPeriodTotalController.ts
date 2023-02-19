import { Request, Response } from 'express';
import { sub, startOfHour, endOfHour, addMinutes } from 'date-fns';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetPostsBoardsPeriodTotalService from '../../../../modules/posts/services/GetPostsBoardsPeriodTotalService';

export default class PostsBoardsPeriodTotalController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPostsBoardsPeriodTotal = new GetPostsBoardsPeriodTotalService();

    const date = new Date();
    const dateUTC = addMinutes(date, date.getTimezoneOffset());

    const defaultFrom = startOfHour(sub(dateUTC, { days: 1, hours: 1 })).toISOString();
    const defaultTo = endOfHour(sub(dateUTC, { hours: 1 })).toISOString();

    const schemaValidation = Joi.object({
      from: Joi.string().isoDate().allow('', null),
      to: Joi.string().isoDate().allow('', null),
      limit: Joi.number().allow('', null)
    });

    const query = {
      from: (request.query.from || defaultFrom) as string,
      to: (request.query.to || defaultTo) as string,
      limit: Number(request.query.limit) || null
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
      const data = await getPostsBoardsPeriodTotal.execute(query);

      const result = {
        result: 'success',
        message: null,
        data
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        {
          error: error.message,
          stack: error.stack,
          controller: 'PostsBoardsPeriodTotalController'
        },
        'Error on '
      );
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
