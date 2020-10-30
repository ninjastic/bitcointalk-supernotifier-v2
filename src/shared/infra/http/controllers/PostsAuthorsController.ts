import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetPostsAuthorsService from '../services/GetPostsAuthorsService';

export default class PostsAuthorsController {
  public async index(request: Request, response: Response): Promise<Response> {
    const getPostsAuthors = container.resolve(GetPostsAuthorsService);

    const schemaValidation = Joi.object({
      author: Joi.string(),
      content: Joi.string(),
      topic_id: Joi.number(),
      board: Joi.number(),
      child_boards: Joi.string().allow('1', '0', 'true', 'false').insensitive(),
      after_date: Joi.string().isoDate(),
      before_date: Joi.string().isoDate(),
      limit: Joi.number(),
    });

    try {
      await schemaValidation.validateAsync(request.query);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    try {
      const data = await getPostsAuthors.execute(request.query);

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
        controller: 'PostsAuthorsController',
      });
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
