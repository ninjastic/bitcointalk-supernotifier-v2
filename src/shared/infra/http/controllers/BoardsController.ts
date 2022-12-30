import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetCacheService from '../../../container/providers/services/GetCacheService';
import SaveCacheService from '../../../container/providers/services/SaveCacheService';
import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';

export default class BoardsController {
  public async index(request: Request, response: Response): Promise<Response> {
    const getBoardsList = container.resolve(GetBoardsListService);
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const query = request.query as unknown as { raw: string };

    const schemaValidation = Joi.object({
      raw: Joi.valid('1', '0', 'true', 'false'),
    });

    try {
      await schemaValidation.validateAsync(query);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    const raw = query.raw === '1' || String(query.raw).toLowerCase() === 'true';

    try {
      const savedCache = await getCache.execute(
        `boards:${raw ? 'raw' : 'organized'}`,
      );

      if (savedCache) {
        return response.json(savedCache);
      }

      if (raw) {
        const data = await getBoardsList.execute(true);

        const result = {
          result: 'success',
          message: null,
          data,
        };

        await saveCache.execute('boards:raw', result);

        return response.json(result);
      }

      const data = await getBoardsList.execute();

      const result = {
        result: 'success',
        message: null,
        data,
      };

      await saveCache.execute('boards:organized', result);

      return response.json(result);
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack,
        controller: 'BoardsController',
      });
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
