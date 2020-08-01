import 'reflect-metadata';
import 'dotenv/config.js';
import { createConnection } from 'typeorm';

import './shared/container';

import { ScrapeRecentPostsQueue } from './modules/posts/infra/jobs';
import { ScrapeMeritsQueue } from './modules/merits/infra/jobs';

createConnection().then(async () => {
  const scrapeRecentPostsQueue = new ScrapeRecentPostsQueue();
  const scrapeMeritsQueue = new ScrapeMeritsQueue();

  // scrapeRecentPostsQueue.run();
  scrapeMeritsQueue.run();
});
