import 'reflect-metadata';
import 'dotenv/config.js';
import Queue from 'bull';
import { container } from 'tsyringe';

import '../../typeorm';
import '../../../container';

import cacheConfig from '../../../../config/cache';
import loggerHandler from '../handlers/loggerHandler';

import CheckPostsService from '../../../../modules/posts/services/CheckPostsService';
import CheckMeritsService from '../../../../modules/merits/services/CheckMeritsService';

(async () => {
  const queue = new Queue('CheckerQueue', {
    redis: cacheConfig.config.redis,
  });

  await queue.removeRepeatable('checkPosts', { every: 5000 });
  await queue.removeRepeatable('checkMerits', { every: 5000 });

  await queue.add('checkPosts', null, {
    removeOnComplete: true,
    removeOnFail: true,
    repeat: { every: 5000 },
  });

  await queue.add('checkMerits', null, {
    removeOnComplete: true,
    removeOnFail: true,
    repeat: { every: 5000 },
  });

  queue.process('checkPosts', async () => {
    const checkPosts = container.resolve(CheckPostsService);
    await checkPosts.execute();
  });

  queue.process('checkMerits', async () => {
    const checkMerits = container.resolve(CheckMeritsService);
    await checkMerits.execute();
  });

  loggerHandler(queue);
})();
