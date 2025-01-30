import { Request, Response } from 'express';
import { sub, startOfHour, endOfHour, addMinutes } from 'date-fns';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetPostsBoardsPeriodService, { GetPostsBoardsPeriodParams } from '../services/GetPostsBoardsPeriodService';
import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';

export default class PostsBoardsPeriodController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPostsBoardsPeriod = new GetPostsBoardsPeriodService();
    const getBoardsListService = new GetBoardsListService();

    const date = new Date();
    const dateUTC = addMinutes(date, date.getTimezoneOffset());

    const defaultFrom = startOfHour(sub(dateUTC, { days: 1, hours: 1 })).toISOString();
    const defaultTo = endOfHour(sub(dateUTC, { hours: 1 })).toISOString();

    const schemaValidation = Joi.object({
      from: Joi.string().isoDate().allow('', null),
      to: Joi.string().isoDate().allow('', null),
      interval: Joi.string(),
      limit: Joi.number().allow('', null)
    });

    const query = {
      from: (request.query.from || defaultFrom) as string,
      to: (request.query.to || defaultTo) as string,
      interval: (request.query.interval || '1h') as string,
      limit: Number(request.query.limit) || null
    };

    try {
      await schemaValidation.validateAsync(query);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null
      });
    }

    try {
      const results = await getPostsBoardsPeriod.execute(query as GetPostsBoardsPeriodParams);
      const boards = await getBoardsListService.execute(true);

      const data = results.map(result => ({
        board_name: boards.find(board => board.board_id === result.board_id)?.name,
        ...result
      }));

      const result = {
        result: 'success',
        message: null,
        data
      };

      return response.json(result);
    } catch (error) {
      logger.error(
        {
          error,
          controller: 'PostsBoardsPeriodController'
        },
        'Error on '
      );
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
