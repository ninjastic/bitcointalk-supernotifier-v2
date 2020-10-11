import { container } from 'tsyringe';
import { Request, Response } from 'express';

import GetCacheService from '../../../container/providers/services/GetCacheService';
import SaveCacheService from '../../../container/providers/services/SaveCacheService';

export default class AlertsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getCache = container.resolve(GetCacheService);

    const alert = await getCache.execute('alertMessage');

    const data = {
      result: 'success',
      data: alert,
    };

    return response.json(data);
  }

  public async create(request: Request, response: Response): Promise<Response> {
    const saveCache = container.resolve(SaveCacheService);

    const { message } = request.body;

    await saveCache.execute('alertMessage', message);

    const data = {
      result: 'success',
      data: message,
    };

    return response.json(data);
  }
}
