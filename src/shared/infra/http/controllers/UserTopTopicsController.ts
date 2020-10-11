import { Request, Response } from 'express';
import { sub, startOfHour, endOfHour, addMinutes } from 'date-fns';

import logger from '../../../services/logger';

import GetUserTopTopicsService from '../services/GetUserTopTopicsService';

export default class UserTopTopicsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getUserTopTopics = new GetUserTopTopicsService();

    const { username } = request.params;
    const { from, to } = request.query as {
      from: string;
      to: string;
    };

    const currentDate = new Date();
    const currentDateUTC = addMinutes(
      currentDate,
      currentDate.getTimezoneOffset(),
    );

    try {
      const data = await getUserTopTopics.execute(
        username,
        from || startOfHour(sub(currentDateUTC, { years: 1 })).toISOString(),
        to || endOfHour(sub(currentDateUTC, { hours: 1 })).toISOString(),
      );

      return response.json(data);

      if (!data.body.aggregations.date.buckets.length) {
        return response.status(404).json({ error: 'Not found' });
      }

      return response.json(data.body.aggregations.date.buckets);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on UserTopTopicsController',
      );
      return response.status(400).json({ error: 'Something went wrong' });
    }
  }
}
