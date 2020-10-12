import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetPostsFromTopicIdService from '../../../../modules/posts/services/GetPostsFromTopicIdService';

export default class TopicsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPostsFromTopicId = container.resolve(GetPostsFromTopicIdService);

    const params = (request.params as unknown) as { topic_id: number };

    const schemaValidation = Joi.object({
      topic_id: Joi.number().allow('', null),
    });

    try {
      await schemaValidation.validateAsync(request.params);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    try {
      const data = await getPostsFromTopicId.execute(params);

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on TopicsController',
      );
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
