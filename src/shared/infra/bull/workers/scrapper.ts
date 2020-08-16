import 'reflect-metadata';
import 'dotenv/config.js';
import { createConnection } from 'typeorm';

import '../../../container';

import { ScrapeRecentPostsJob } from '../../../../modules/posts/infra/jobs';
import { ScrapeMeritsJob } from '../../../../modules/merits/infra/jobs';

import ForumScrapperQueue from '../queues/ForumScrapperQueue';

createConnection().then(() => {
  ScrapeRecentPostsJob.start();
  ScrapeMeritsJob.start();

  ForumScrapperQueue.run();
});
