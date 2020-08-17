import 'reflect-metadata';
import 'dotenv/config.js';
import { createConnection } from 'typeorm';
import Queue from 'bull';

import '../../../container';

import cacheConfig from '../../../../config/cache';

import { ScrapeRecentPostsJob } from '../../../../modules/posts/infra/jobs';
import { ScrapeMeritsJob } from '../../../../modules/merits/infra/jobs';

import ForumScrapperQueue from '../queues/ForumScrapperQueue';

createConnection().then(async () => {
  const queue = new Queue('forumScrapper', {
    redis: cacheConfig.config.redis,
    limiter: {
      max: 1,
      duration: 1000,
    },
  });

  await queue.removeRepeatable('scrapeRecentPosts', { every: 5000 });
  await queue.removeRepeatable('scrapeMerits', { every: 15000 });

  await ScrapeRecentPostsJob.start();
  await ScrapeMeritsJob.start();

  ForumScrapperQueue.run();
});
