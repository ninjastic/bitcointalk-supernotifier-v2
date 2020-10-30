import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetPostsHistoryByPostIdService from '../../../../modules/posts/services/GetPostsHistoryByPostIdService';
import GetLatestPostHistoryService from '../../../../modules/posts/services/GetLatestPostHistoryService';
import GetNextPostChangeCheckService from '../../../../modules/posts/services/GetNextPostChangeCheckService';

export default class PostsHistoryController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPostsHistoryByPostId = container.resolve(
      GetPostsHistoryByPostIdService,
    );
    const getNextPostChangeCheck = container.resolve(
      GetNextPostChangeCheckService,
    );

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
      const postHistory = await getPostsHistoryByPostId.execute(params);
      const nextCheck = await getNextPostChangeCheck.execute(params);

      if (postHistory) {
        delete postHistory.boards;
        delete postHistory.version;
        delete postHistory.notified;
        delete postHistory.notified_to;
        delete postHistory.checked;
      }

      return response.json({
        result: 'success',
        message: null,
        data: {
          next_check: nextCheck || null,
          post_history: postHistory ? [{ ...postHistory }] : [],
        },
      });
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack,
        controller: 'PostsHistoryController',
      });
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }

  public async index(request: Request, response: Response): Promise<Response> {
    const getLatestPostHistory = container.resolve(GetLatestPostHistoryService);

    const schemaValidation = Joi.object({
      author: Joi.string().allow('', null),
      content: Joi.string().allow('', null),
      topic_id: Joi.number().allow('', null),
      board: Joi.number().allow('', null),
      deleted: Joi.valid('1', '0', 'true', 'false'),
      last: Joi.string().isoDate().allow('', null),
      after: Joi.string().isoDate().allow('', null),
      after_date: Joi.string().isoDate().allow('', null),
      before_date: Joi.string().isoDate().allow('', null),
      limit: Joi.number().allow('', null),
      order: Joi.string().valid('ASC', 'DESC').insensitive(),
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

    const query = {
      ...request.query,
      deleted: !!(
        request.query.deleted === '1' ||
        String(request.query.deleted).toLowerCase() === 'true'
      ),
    };

    try {
      const data = await getLatestPostHistory.execute(query);

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on PostsHistoryController',
      );
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
