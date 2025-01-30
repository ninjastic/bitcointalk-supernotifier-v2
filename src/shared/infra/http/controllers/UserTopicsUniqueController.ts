import { Request as ExpressRequest, Response } from 'express';
import { endOfHour, addMinutes } from 'date-fns';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetTopicsUniqueService from '../services/GetTopicsUniqueService';

interface Request extends ExpressRequest {
  query: {
    from: string;
    to: string;
  };
}

export default class UserTopicsUniqueController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getTopicsUniqueService = new GetTopicsUniqueService();

    const date = new Date();
    const dateUTC = addMinutes(date, date.getTimezoneOffset());

    const defaultTo = endOfHour(dateUTC).toISOString();

    const schemaValidation = Joi.object({
      author_uid: Joi.number().required(),
      from: Joi.string().isoDate().allow('', null),
      to: Joi.string().isoDate().allow('', null)
    });

    const query = {
      author_uid: request.author_uid,
      from: request.query.from || undefined,
      to: request.query.to || defaultTo
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
      const data = await getTopicsUniqueService.execute(query);

      const result = {
        result: 'success',
        message: null,
        data
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error,
        controller: 'UserTopicsUniqueController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
