import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetAddressesAuthorsService from '../services/GetAddressesAuthorsService';

export default class AddressesAuthorsController {
  public async index(request: Request, response: Response): Promise<Response> {
    const getAddressesAuthors = container.resolve(GetAddressesAuthorsService);

    const schemaValidation = Joi.object({
      address: Joi.string(),
      author: Joi.string(),
      coin: Joi.string().valid('BTC', 'ETH', 'TRX').insensitive(),
      post_id: Joi.number(),
      topic_id: Joi.number(),
      board: Joi.number(),
      child_boards: Joi.string().allow('1', '0', 'true', 'false').insensitive(),
      limit: Joi.number()
    });

    try {
      await schemaValidation.validateAsync(request.query);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null
      });
    }

    try {
      const data = await getAddressesAuthors.execute(request.query);

      const result = {
        result: 'success',
        message: null,
        data
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error,
        controller: 'AddressesAuthorsController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
