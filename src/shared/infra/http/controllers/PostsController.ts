import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import IFindPostsConditionsDTO from '../../../../modules/posts/dtos/IFindPostsConditionsDTO';

import GetPostsFromListService from '../../../../modules/posts/services/GetPostsFromListService';
import GetPostsService from '../services/GetPostsService';

export default class PostsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPostsFromList = container.resolve(GetPostsFromListService);

    const params = (request.params as unknown) as { id_list: string };

    const id_list = params.id_list.split(',').map(id => Number(id));

    const schemaValidation = Joi.object({
      id_list: Joi.array().items(Joi.number()),
    });

    try {
      await schemaValidation.validateAsync({ id_list });
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    const data = await getPostsFromList.execute({ id_list });

    const result = {
      result: 'success',
      message: null,
      data,
    };

    return response.json(result);
  }

  public async index(request: Request, response: Response): Promise<Response> {
    const getPosts = container.resolve(GetPostsService);

    const schemaValidation = Joi.object({
      author: Joi.string().allow('', null),
      content: Joi.string().allow('', null),
      topic_id: Joi.number().allow('', null),
      board: Joi.number().allow('', null),
      child_boards: Joi.string().allow('1', '0', 'true', 'false').insensitive(),
      last: Joi.number().allow('', null),
      after: Joi.number().allow('', null),
      after_date: Joi.string().isoDate().allow('', null),
      before_date: Joi.string().isoDate().allow('', null),
      limit: Joi.number().allow('', null),
      order: Joi.string().valid('ASC', 'DESC').insensitive(),
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
      const data = await getPosts.execute(query as IFindPostsConditionsDTO);

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
        controller: 'PostsController',
      });
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
