import 'reflect-metadata';
import 'dotenv/config.js';
import Queue from 'bull';
import { container } from 'tsyringe';

import '../../typeorm';
import '../../../container';

import cacheConfig from '../../../../config/cache';
import loggerHandler from '../handlers/loggerHandler';

import CheckPostsService from '../../../../modules/posts/services/CheckPostsService';
import CheckPostsHistoryService from '../../../../modules/posts/services/CheckPostsHistoryService';
import CheckMeritsService from '../../../../modules/merits/services/CheckMeritsService';
import CheckModLogsService from '../../../../modules/modlog/services/CheckModLogsService';
import CheckPostsAddressesService from '../../../../modules/posts/services/CheckPostsAddressesService';

(async () => {
  const queue = new Queue('CheckerQueue', {
    redis: cacheConfig.config.redis,
  });

  await queue.removeRepeatable('checkPosts', { every: 5000 });
  await queue.removeRepeatable('checkPostsHistory', { every: 120000 });
  await queue.removeRepeatable('checkMerits', { every: 5000 });
  await queue.removeRepeatable('checkModLogs', { every: 300000 });
  await queue.removeRepeatable('checkPostsAddresses', { every: 20000 });

  await queue.add('checkPosts', null, {
    removeOnComplete: true,
    removeOnFail: true,
    repeat: { every: 5000 },
  });

  await queue.add('checkPostsHistory', null, {
    removeOnComplete: true,
    removeOnFail: true,
    repeat: { every: 120000 },
  });

  await queue.add('checkMerits', null, {
    removeOnComplete: true,
    removeOnFail: true,
    repeat: { every: 5000 },
  });

  await queue.add('checkModLogs', null, {
    removeOnComplete: true,
    removeOnFail: true,
    repeat: { every: 300000 },
  });

  await queue.add('checkPostsAddresses', null, {
    removeOnComplete: true,
    removeOnFail: true,
    repeat: { every: 20000 },
  });

  queue.process('checkPosts', async () => {
    const checkPosts = container.resolve(CheckPostsService);
    await checkPosts.execute();
  });

  queue.process('checkPostsHistory', async () => {
    const checkPostsHistory = container.resolve(CheckPostsHistoryService);
    await checkPostsHistory.execute();
  });

  queue.process('checkMerits', async () => {
    const checkMerits = container.resolve(CheckMeritsService);
    await checkMerits.execute();
  });

  queue.process('checkModLogs', async () => {
    const checkModLogs = container.resolve(CheckModLogsService);
    await checkModLogs.execute();
  });

  queue.process('checkPostsAddresses', async () => {
    const checkPostsAddresses = container.resolve(CheckPostsAddressesService);
    await checkPostsAddresses.execute();
  });

  loggerHandler(queue);
})();
