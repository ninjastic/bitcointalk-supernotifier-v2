import { container } from 'tsyringe';
import type { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import type IFindPostAddressesDTO from '../../../../modules/posts/dtos/IFindPostAddressesDTO';

import GetAddressesUniqueService from '../services/GetAddressesUniqueService';

export default class AddressesUniqueController {
  public async index(request: Request, response: Response): Promise<Response> {
    const getAddressesUnique = container.resolve(GetAddressesUniqueService);

    const schemaValidation = Joi.object({
      address: Joi.string(),
      addresses: Joi.array().items(Joi.string()),
      author: Joi.string(),
      author_uid: Joi.number(),
      coin: Joi.string().valid('BTC', 'ETH', 'TRX').insensitive(),
      post_id: Joi.number(),
      topic_id: Joi.number(),
      board: Joi.number(),
      child_boards: Joi.string().allow('1', '0', 'true', 'false').insensitive(),
      last: Joi.string(),
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
      const data = await getAddressesUnique.execute(request.query as IFindPostAddressesDTO);

      const result = {
        result: 'success',
        message: null,
        data
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error,
        controller: 'AddressesUniqueController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
