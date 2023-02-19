import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetMeritsTopFansService from '../services/GetMeritsTopFansService';

export default class MeritsTopFriendsController {
  public async index(request: Request, response: Response): Promise<Response> {
    const getMeritsTopFans = new GetMeritsTopFansService();

    const schemaValidation = Joi.object({
      post_id: Joi.number(),
      topic_id: Joi.number(),
      receiver: Joi.string(),
      receiver_uid: Joi.number(),
      sender: Joi.string(),
      sender_uid: Joi.number(),
      amount: Joi.number(),
      board_id: Joi.number(),
      after_date: Joi.string().isoDate(),
      before_date: Joi.string().isoDate(),
      order: Joi.string().allow('asc', 'desc').insensitive(),
      limit: Joi.number()
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

    try {
      const data = await getMeritsTopFans.execute(request.query);

      const result = {
        result: 'success',
        message: null,
        data
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack,
        controller: 'MeritsTopFriendsController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
