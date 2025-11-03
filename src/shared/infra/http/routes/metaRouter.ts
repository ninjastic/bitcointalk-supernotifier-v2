import type { Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import type { PostFromES } from '../../../../modules/posts/repositories/IPostsRepository';
import esClient from '../../../services/elastic';
import type ICacheProvider from '../../../container/providers/models/ICacheProvider';

const metaRouter = Router();
const cacheRepository = container.resolve<ICacheProvider>('CacheRepository');

metaRouter.get('/', async (request: Request, response: Response): Promise<Response> => {
  const cached = await cacheRepository.recover('apiMeta');

  if (cached) {
    return response.json(cached);
  }

  const result1 = await esClient.search<PostFromES>({
    index: 'posts',
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
  });

  const result2 = await esClient.search({
    index: 'merits',
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
  });

  const { value: result1Value } = result1.aggregations.posts_notifications_sum as { value: number };
  const { value: result2Value } = result2.aggregations.merits_notifications_sum as { value: number };

  const data = {
    mentions: result1Value,
    merits: result2Value,
    total: result1Value + result2Value
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
