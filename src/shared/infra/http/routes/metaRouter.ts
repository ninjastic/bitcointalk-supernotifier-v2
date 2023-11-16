import { Router, Request, Response } from 'express';
import { container } from 'tsyringe';

import esClient from '../../../services/elastic';
import ICacheProvider from '../../../container/providers/models/ICacheProvider';

const metaRouter = Router();
const cacheRepository = container.resolve<ICacheProvider>('CacheRepository');

metaRouter.get('/', async (request: Request, response: Response): Promise<Response> => {
  const cached = await cacheRepository.recover('apiMeta');

  if (cached) {
    return response.json(cached);
  }

  const result1 = await esClient.search({
    index: 'posts',
    body: {
      aggs: {
        posts_notifications_sum: {
          sum: {
            script: {
              lang: 'painless',
              source: "doc['notified_to'].length"
            }
          }
        }
      }
    }
  });

  const result2 = await esClient.search({
    index: 'merits',
    body: {
      aggs: {
        merits_notifications_sum: {
          sum: {
            script: {
              lang: 'painless',
              source: "doc['notified_to'].length"
            }
          }
        }
      }
    }
  });

  const data = {
    mentions: result1.body.aggregations.posts_notifications_sum.value,
    merits: result2.body.aggregations.merits_notifications_sum.value,
    total:
      result1.body.aggregations.posts_notifications_sum.value + result2.body.aggregations.merits_notifications_sum.value
  };

  const result = {
    result: 'success',
    message: null,
    data
  };

  await cacheRepository.save('apiMeta', result, 'EX', 300);

  return response.json(result);
});

export default metaRouter;
