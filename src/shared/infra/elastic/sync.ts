/* eslint-disable no-promise-executor-return */
/* eslint-disable no-constant-condition */
/* eslint-disable no-await-in-loop */
import 'reflect-metadata';
import 'dotenv/config';
import { createConnection } from 'typeorm';

import 'shared/container';

import { syncPostsPipeline } from './pipelines/sync-posts';
import { syncMeritsPipeline } from './pipelines/sync-merits';
import { syncTopicsPipeline } from './pipelines/sync-topics';
import { syncPostsHistoryPipeline } from './pipelines/sync-posts-history';
import { syncPostsAddressesPipeline } from './pipelines/sync-posts-addresses';
import { syncBoardsPipeline } from './pipelines/sync-boards';

async function syncAll() {
  const connection = await createConnection();

  while (true) {
    await syncPostsPipeline(connection);
    await syncMeritsPipeline(connection);
    await syncTopicsPipeline(connection);
    await syncPostsHistoryPipeline(connection);
    await syncPostsAddressesPipeline(connection);
    await syncBoardsPipeline(connection);

    await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 1));
  }
}

syncAll();
