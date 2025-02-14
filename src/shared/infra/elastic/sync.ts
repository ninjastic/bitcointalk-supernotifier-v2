import 'reflect-metadata';
import 'dotenv/config';
import { createConnection } from 'typeorm';

import 'shared/container';

import { syncPostsPipeline } from './pipelines/sync-posts';
import { syncMeritsPipeline } from './pipelines/sync-merits';
import { syncTopicsPipeline } from './pipelines/sync-topics';
import { syncPostsHistoryPipeline } from './pipelines/sync-posts-history';
import { syncPostsAddressesPipeline } from './pipelines/sync-posts-addresses';

async function syncAll() {
  const connection = await createConnection();

  await syncPostsPipeline(connection);
  await syncMeritsPipeline(connection);
  await syncTopicsPipeline(connection);
  await syncPostsHistoryPipeline(connection);
  await syncPostsAddressesPipeline(connection);
}

syncAll();
