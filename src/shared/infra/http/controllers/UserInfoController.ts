import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetAuthorDataService from '../services/GetAuthorDataService';

export default class UserInfoController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getAuthorData = new GetAuthorDataService();

    const schemaValidation = Joi.object({
      author_uid: Joi.number().required(),
    });

    try {
      await schemaValidation.validateAsync({ author_uid: request.author_uid });
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    try {
      const data = await getAuthorData.execute({
        author_uid: request.author_uid,
      });

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack,
        controller: 'UserInfoController',
      });
      return response.status(500).json({
        result: 'fail',
        message: error.message || 'Something went wrong',
        data: null,
      });
    }
  }
}
