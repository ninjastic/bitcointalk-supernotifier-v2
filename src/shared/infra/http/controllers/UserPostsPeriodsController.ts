import { Request, Response } from 'express';
import { sub, addMinutes, startOfDay, endOfDay } from 'date-fns';

import logger from '../../../services/logger';

import GetUserPostsOnPeriodService from '../../../../modules/posts/services/GetUserPostsOnPeriodService';

export default class UserPostsPeriodsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserPostsOnPeriod = new GetUserPostsOnPeriodService();

    const { username } = request.params;
    const { from, to, interval } = request.query as {
      from: string;
      to: string;
      interval: string;
    };

    const currentDate = new Date();
    const currentDateUTC = addMinutes(
      currentDate,
      currentDate.getTimezoneOffset(),
    );

    try {
      const data = await getUserPostsOnPeriod.execute(username, {
        from:
          from ||
          sub(startOfDay(currentDateUTC), {
            days: 6,
          }).toISOString(),
        to: to || endOfDay(currentDate).toISOString(),
        interval: interval || '1d',
      });

      return response.json(data);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on UserPostsPeriodsController',
      );
      return response
        .status(400)
        .json({ result: 400, error: 'Something went wrong' });
    }
  }
}
