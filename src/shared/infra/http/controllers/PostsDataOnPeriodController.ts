import { Request, Response } from 'express';
import { sub, startOfHour } from 'date-fns';

import logger from '../../../services/logger';

import GetPostsDataOnPeriodService from '../../../../modules/posts/services/GetPostsDataOnPeriodService';

export default class PostsDataOnPeriodController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getPostsDataOnPeriod = new GetPostsDataOnPeriodService();

    const { from, to, interval } = request.query as {
      from: string;
      to: string;
      interval: string;
    };

    try {
      const data = await getPostsDataOnPeriod.execute({
        from: from || startOfHour(sub(new Date(), { days: 1 })).toISOString(),
        to: to || new Date().toISOString(),
        interval: interval || '30m',
      });

      if (!data.body.aggregations.date.buckets.length) {
        return response.status(404).json({ error: 'Not found' });
      }

      return response.json(data.body.aggregations.date.buckets);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error on PostsDataOnPeriodController',
      );
      return response.status(400).json({ error: 'Something went wrong' });
    }
  }
}
