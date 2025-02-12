import 'reflect-metadata';
import 'dotenv/config';
import { createConnection } from 'typeorm';

import 'shared/container';

import { syncPostsPipeline } from './pipelines/sync-posts';
import { syncTopicsPipeline } from './pipelines/sync-topics';
import { syncPostsHistoryPipeline } from './pipelines/sync-posts-history';
import { syncPostsAddressesPipeline } from './pipelines/sync-posts-addresses';

async function syncAll() {
  const connection = await createConnection();

  await Promise.all([
    syncPostsPipeline(connection),
    syncTopicsPipeline(connection),
    syncPostsHistoryPipeline(connection),
    syncPostsAddressesPipeline(connection)
  ]);
}

syncAll();
