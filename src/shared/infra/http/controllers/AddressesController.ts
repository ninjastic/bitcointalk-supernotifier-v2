import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetAddressService from '../services/GetAddressService';
import GetAddressesService from '../services/GetAddressesService';

export default class AddressesController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getAddress = container.resolve(GetAddressService);

    const params = request.params as unknown as { address: string };

    const addressRegex =
      /0x[a-fA-F0-9]{40}|(bc(0([ac-hj-np-z02-9]{39}|[ac-hj-np-z02-9]{59})|1[ac-hj-np-z02-9]{8,87})|[13][a-km-zA-HJ-NP-Z1-9]{25,35})|\bT[A-Za-z1-9]{33}\b/;

    const schemaValidation = Joi.object({
      address: Joi.string().regex(addressRegex).message('Address is invalid').required()
    });

    try {
      await schemaValidation.validateAsync(params);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null
      });
    }

    try {
      const data = await getAddress.execute(params);

      const result = {
        result: 'success',
        message: null,
        data: data || null
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack,
        controller: 'AddressesController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }

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
        error: error.message,
        stack: error.stack,
        controller: 'AddressesController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
