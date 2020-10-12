import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import FindAddressesByAuthorService from '../../../../modules/posts/services/FindAddressesByAuthorService';

export default class AddressAuthorsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const findAddressesByAuthor = container.resolve(
      FindAddressesByAuthorService,
    );

    const params = (request.params as unknown) as {
      username: string;
    };

    const query = (request.query as unknown) as {
      last: string;
      limit: number;
    };

    const schemaValidation = Joi.object({
      username: Joi.string().required(),
      last: Joi.string()
        .regex(/^\S+,\S+,\S+$/)
        .allow('', null),
      limit: Joi.number().allow('', null),
    });

    try {
      await schemaValidation.validateAsync({ ...params, ...query });
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    const [last_address, last_created_at, last_id] = query.last
      ? query.last.trim().split(',')
      : Array(3).fill(null);

    try {
      const data = await findAddressesByAuthor.execute({
        ...params,
        ...query,
        last_address,
        last_created_at: new Date(last_created_at),
        last_id,
      });

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on UserAddressesController',
      );
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
