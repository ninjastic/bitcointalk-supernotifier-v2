import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetUserPostsDataService from '../../../../modules/posts/services/GetUserPostsDataService';

export default class UserPostsBoardsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserPostsData = new GetUserPostsDataService();

    const params = (request.params as unknown) as {
      username: string;
    };

    const query = (request.query as unknown) as {
      from: string;
      to: string;
    };

    const schemaValidation = Joi.object({
      username: Joi.string().required(),
      from: Joi.string().isoDate().allow('', null),
      to: Joi.string().isoDate().allow('', null),
    });

    const settings = {
      username: params.username,
      from: query.from || null,
      to: query.to || null,
    };

    try {
      await schemaValidation.validateAsync(settings);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    try {
      const data = await getUserPostsData.execute(settings);

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on UserPostsBoardsController',
      );
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
