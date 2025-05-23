/* eslint-disable no-promise-executor-return */
/* eslint-disable no-constant-condition */
/* eslint-disable no-await-in-loop */
import 'reflect-metadata';
import 'dotenv/config';
import { container } from 'tsyringe';
import yargs from 'yargs';
import { createConnection } from 'typeorm';
import esClient from 'shared/services/elastic';

import 'shared/container';
import logger from '##/shared/services/logger';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';

import { SyncPostsPipeline } from './pipelines/sync-posts';
import { SyncPostsVersionsPipeline } from './pipelines/sync-posts-versions';
import { SyncMeritsPipeline } from './pipelines/sync-merits';
import { SyncTopicsPipeline } from './pipelines/sync-topics';
import { SyncPostsHistoryPipeline } from './pipelines/sync-posts-history';
import { SyncPostsAddressesPipeline } from './pipelines/sync-posts-addresses';
import { SyncBoardsPipeline } from './pipelines/sync-boards';

async function syncAll() {
  const connection = await createConnection();
  const cacheRepository = container.resolve<RedisProvider>('CacheRepository');

  const syncPostsPipeline = new SyncPostsPipeline(connection, esClient, cacheRepository);
  const syncPostsVersionsPipeline = new SyncPostsVersionsPipeline(connection, esClient, cacheRepository);
  const syncMeritsPipeline = new SyncMeritsPipeline(connection, esClient, cacheRepository);
  const syncTopicsPipeline = new SyncTopicsPipeline(connection, esClient, cacheRepository);
  const syncPostsHistoryPipeline = new SyncPostsHistoryPipeline(connection, esClient, cacheRepository);
  const syncPostsAddressesPipeline = new SyncPostsAddressesPipeline(connection, esClient, cacheRepository);
  const syncBoardsPipeline = new SyncBoardsPipeline(connection, esClient);

  const argv = yargs
    .option('bootstrap', {
      type: 'boolean',
      default: false
    })
    .option('lastPostId', {
      type: 'number',
      default: 0,
      requiresArg: true
    })
    .implies('lastPostId', 'bootstrap')
    .parseSync();

  const { bootstrap, lastPostId } = argv;

  if (bootstrap) {
    logger.info('Starting bootstrap synchronization');
    await syncPostsPipeline.execute(bootstrap, lastPostId);
    await syncMeritsPipeline.execute(bootstrap);
    logger.info('Bootstrap synchronization completed');
  }

  while (true) {
    await syncPostsPipeline.execute();
    await syncPostsVersionsPipeline.execute();
    await syncMeritsPipeline.execute();
    await syncTopicsPipeline.execute();
    await syncPostsHistoryPipeline.execute();
    await syncPostsAddressesPipeline.execute();
    await syncBoardsPipeline.execute();

    await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 1));
  }
}

syncAll();
