import { container } from 'tsyringe';
import { Request, Response } from 'express';

import GetCacheService from '../../../container/providers/services/GetCacheService';
import SaveCacheService from '../../../container/providers/services/SaveCacheService';
import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';

export default class AddressesController {
  public async index(request: Request, response: Response): Promise<Response> {
    const getBoardsList = container.resolve(GetBoardsListService);
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const { raw } = request.query;

    const savedCache = await getCache.execute(
      `boards:${raw ? 'raw' : 'organized'}`,
    );

    if (savedCache) {
      return response.json(savedCache);
    }

    if (raw) {
      const boardsRaw = await getBoardsList.execute(true);
      await saveCache.execute('boards:raw', boardsRaw);

      return response.json(boardsRaw);
    }

    const boards = await getBoardsList.execute();
    await saveCache.execute('boards:organized', boards);

    return response.json(boards);
  }
}
