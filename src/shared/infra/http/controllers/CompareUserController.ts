import { Request, Response } from 'express';
import Joi from 'joi';

// import logger from '../../../services/logger';

import CompareUsersService from '../../../tools/detective/services/CompareUsersService';

export default class CompareUserController {
  public async index(request: Request, response: Response): Promise<Response> {
    const compareUsersService = new CompareUsersService();

    const { firstAuthorUid, secondAuthorUid } = request.query as unknown as {
      firstAuthorUid: number;
      secondAuthorUid: number;
    };

    const schemaValidation = Joi.object({
      firstAuthorUid: Joi.number().required(),
      secondAuthorUid: Joi.number().required()
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

    const data = await compareUsersService.execute(firstAuthorUid, secondAuthorUid);

    return response.send(data);
  }
}
