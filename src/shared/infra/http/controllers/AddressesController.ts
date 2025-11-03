import { container } from 'tsyringe';
import type { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetAddressesService from '../services/GetAddressesService';

export default class AddressesController {
  public async index(request: Request, response: Response): Promise<Response> {
    const getAddresses = container.resolve(GetAddressesService);

    const { query } = request;

    const schemaValidation = Joi.object({
      address: Joi.string(),
      author: Joi.string(),
      author_uid: Joi.number(),
      coin: Joi.string().valid('BTC', 'ETH', 'TRX').insensitive(),
      post_id: Joi.number(),
      topic_id: Joi.number(),
      board: Joi.number(),
      child_boards: Joi.string().allow('1', '0', 'true', 'false').insensitive(),
      last: Joi.number(),
      order: Joi.string().valid('ASC', 'DESC').insensitive(),
      limit: Joi.number()
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
      const data = await getAddresses.execute(query);

      const result = {
        result: 'success',
        message: null,
        data
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error,
        controller: 'AddressesController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
