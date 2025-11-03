import { container } from 'tsyringe';
import type { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import type IFindPostAddressesDTO from '../../../../modules/posts/dtos/IFindPostAddressesDTO';

import GetAddressesTopUniqueService from '../services/GetAddressesTopUniqueService';

export default class AddressesTopUniqueController {
  public async index(request: Request, response: Response): Promise<Response> {
    const getAddressesTopUnique = container.resolve(GetAddressesTopUniqueService);

    const schemaValidation = Joi.object({
      address: Joi.string(),
      author: Joi.string(),
      author_uid: Joi.number(),
      coin: Joi.string().valid('BTC', 'ETH', 'TRX').insensitive(),
      post_id: Joi.number(),
      topic_id: Joi.number(),
      board: Joi.number(),
      child_boards: Joi.string().allow('1', '0', 'true', 'false').insensitive(),
      limit: Joi.number()
    });

    const query = request.query as unknown;

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
      const data = await getAddressesTopUnique.execute(query as IFindPostAddressesDTO);

      const result = {
        result: 'success',
        message: null,
        data
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error,
        controller: 'AddressesTopUniqueController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
