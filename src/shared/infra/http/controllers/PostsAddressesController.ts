import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetAddressesByPostIdService from '../services/GetAddressesByPostIdService';

export default class PostsAddressesController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getAddressesByPostId = container.resolve(GetAddressesByPostIdService);

    const params = (request.params as unknown) as { post_id: number };

    const schemaValidation = Joi.object({
      post_id: Joi.number().required(),
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
      const data = await getAddressesByPostId.execute(params);

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on PostsAddressesController',
      );
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
