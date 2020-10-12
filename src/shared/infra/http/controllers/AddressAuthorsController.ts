import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import FindAuthorsByAddressService from '../../../../modules/posts/services/FindAuthorsByAddressService';

export default class AddressAuthorsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const findAuthorsByAddress = container.resolve(FindAuthorsByAddressService);

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
      const data = await findAuthorsByAddress.execute(params);

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on AddressAuthorsController',
      );
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
