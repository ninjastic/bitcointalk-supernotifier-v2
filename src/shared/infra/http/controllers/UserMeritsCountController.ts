import { container } from 'tsyringe';
import { Request, Response } from 'express';

import logger from '../../../services/logger';

import GetUserMeritCountOnPeriodService from '../../../../modules/merits/services/GetUserMeritCountOnPeriodService';

export default class UserMeritsCountController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserMeritCountOnPeriod = container.resolve(
      GetUserMeritCountOnPeriodService,
    );

    const { username } = request.params;

    try {
      const data = await getUserMeritCountOnPeriod.execute(username);

      if (!data.length) {
        return response.status(404).json({ error: 'Not found' });
      }

      return response.json(data);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on UserMeritsDataController',
      );
      return response.status(400).json({ error: 'Something went wrong' });
    }
  }
}
