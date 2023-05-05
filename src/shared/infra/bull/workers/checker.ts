import 'reflect-metadata';
import 'dotenv/config.js';
import { container } from 'tsyringe';

import '../../typeorm';
import '../../../container';

import checkerQueue from '../queues/checkerQueue';
import CheckPostsService from '../../../../modules/posts/services/CheckPostsService';
import CheckPostsHistoryService from '../../../../modules/posts/services/CheckPostsHistoryService';
import CheckMeritsService from '../../../../modules/merits/services/CheckMeritsService';
import CheckModLogsService from '../../../../modules/modlog/services/CheckModLogsService';
import CheckPostsAddressesService from '../../../../modules/posts/services/CheckPostsAddressesService';
import CheckPostsRescraperForChangesService from '../../../../modules/posts/services/CheckPostsRescraperForChangesService';

(async () => {
  await checkerQueue.removeRepeatable('checkPosts', { every: 5000 });
  await checkerQueue.removeRepeatable('checkPostsHistory', { every: 120000 });
  await checkerQueue.removeRepeatable('checkMerits', { every: 5000 });
  await checkerQueue.removeRepeatable('checkModLogs', { every: 300000 });
  await checkerQueue.removeRepeatable('checkPostsAddresses', { every: 20000 });
  await checkerQueue.removeRepeatable('checkPostsRescraperForChanges', {
    every: 20000
  });

  await checkerQueue.add('checkPosts', null, {
    repeat: { every: 5000 }
  });

  await checkerQueue.add('checkPostsHistory', null, {
    repeat: { every: 120000 }
  });

  await checkerQueue.add('checkMerits', null, {
    repeat: { every: 5000 }
  });

  await checkerQueue.add('checkModLogs', null, {
    repeat: { every: 300000 }
  });

  await checkerQueue.add('checkPostsAddresses', null, {
    repeat: { every: 20000 }
  });

  await checkerQueue.add('checkPostsRescraperForChanges', null, {
    repeat: { every: 30000 }
  });

  checkerQueue.process('checkPosts', async () => {
    const checkPosts = container.resolve(CheckPostsService);
    await checkPosts.execute();
  });

  checkerQueue.process('checkPostsHistory', async () => {
    const checkPostsHistory = container.resolve(CheckPostsHistoryService);
    await checkPostsHistory.execute();
  });

  checkerQueue.process('checkMerits', async () => {
    const checkMerits = container.resolve(CheckMeritsService);
    await checkMerits.execute();
  });

  checkerQueue.process('checkModLogs', async () => {
    const checkModLogs = container.resolve(CheckModLogsService);
    await checkModLogs.execute();
  });

  checkerQueue.process('checkPostsAddresses', async () => {
    const checkPostsAddresses = container.resolve(CheckPostsAddressesService);
    await checkPostsAddresses.execute();
  });

  checkerQueue.process('checkPostsRescraperForChanges', async () => {
    const checkPostsRescraperForChanges = container.resolve(CheckPostsRescraperForChangesService);
    await checkPostsRescraperForChanges.execute();
  });
})();
