import { Request, Response } from 'express';
import { sub, addMinutes, startOfDay, endOfDay } from 'date-fns';

import logger from '../../../services/logger';

import GetUserPostsOnPeriodService from '../../../../modules/posts/services/GetUserPostsOnPeriodService';

export default class UserPostsDataController {
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

      if (!data.body.hits.hits[0]) {
        return response.status(404).json({ error: 'Not found' });
      }

      const results = {
        user: {
          author: data.body.hits.hits[0]._source.author,
          author_uid: data.body.hits.hits[0]._source.author_uid,
        },
        posts_count: data.body.hits.total.value,
        intervals: data.body.aggregations.date.buckets,
      };

      return response.json(results);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on UserPostsPeriodController',
      );
      return response.status(400).json({ error: 'Something went wrong' });
    }
  }
}
