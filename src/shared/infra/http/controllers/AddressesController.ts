import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetAddressService from '../services/GetAddressService';
import GetAddressesService from '../../../../modules/posts/services/GetAddressesService';

export default class AddressesController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getAddress = container.resolve(GetAddressService);

    const params = (request.params as unknown) as { address: string };

    const schemaValidation = Joi.object({
      address: Joi.string().required(),
    });

    try {
      await schemaValidation.validateAsync(params);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    try {
      const data = await getAddress.execute(params);

      const result = {
        result: 'success',
        message: null,
        data: data || null,
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on AddressesController',
      );
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }

  public async index(request: Request, response: Response): Promise<Response> {
    const getAddresses = container.resolve(GetAddressesService);

    const params = (request.query as unknown) as {
      address: string;
      last: string;
      limit: number;
    };

    const schemaValidation = Joi.object({
      address: Joi.string().allow('', null),
      last: Joi.string().allow('', null),
      limit: Joi.number().allow('', null),
    });

    try {
      await schemaValidation.validateAsync(request.query);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    try {
      const data = await getAddresses.execute(params);

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on AddressesController',
      );
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
