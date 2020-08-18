import 'reflect-metadata';
import 'dotenv/config.js';
import Queue from 'bull';

import '../../typeorm';
import '../../../container';

import cacheConfig from '../../../../config/cache';

import { CheckMentionsJob } from '../../../../modules/posts/infra/jobs';
import { CheckMeritsJob } from '../../../../modules/merits/infra/jobs';

import MentionCheckerQueue from '../queues/MentionCheckerQueue';
import MeritsCheckerQueue from '../queues/MeritsCheckerQueue';

(async () => {
  const queue = new Queue('mentionsChecker', {
    redis: cacheConfig.config.redis,
  });

  await queue.removeRepeatable('checkMentions', { every: 5000 });
  await queue.removeRepeatable('checkMerits', { every: 5000 });

  await CheckMentionsJob.start();
  await CheckMeritsJob.start();

  MentionCheckerQueue.run();
  MeritsCheckerQueue.run();
})();
