import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import IFindPostAddressesDTO from '../../../../modules/posts/dtos/IFindPostAddressesDTO';

import GetAddressesAuthorsService from '../services/GetAddressesAuthorsService';

export default class AddressesAuthorsController {
  public async index(request: Request, response: Response): Promise<Response> {
    const getAddresses = container.resolve(GetAddressesAuthorsService);

    const schemaValidation = Joi.object({
      address: Joi.string().allow('', null),
      author: Joi.string().allow('', null),
      coin: Joi.string().allow('', null),
      board: Joi.number().allow('', null),
    });

    const query = request.query as unknown;

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
      const data = await getAddresses.execute(query as IFindPostAddressesDTO);

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on AddressesAuthorsController',
      );
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
