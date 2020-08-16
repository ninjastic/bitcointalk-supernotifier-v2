import 'reflect-metadata';
import 'dotenv/config.js';
import { createConnection } from 'typeorm';

import '../../../container';

import { CheckMentionsJob } from '../../../../modules/posts/infra/jobs';
import { CheckMeritsJob } from '../../../../modules/merits/infra/jobs';

import MentionCheckerQueue from '../queues/MentionCheckerQueue';
import MeritsCheckerQueue from '../queues/MeritsCheckerQueue';

createConnection().then(async () => {
  CheckMentionsJob.start();
  CheckMeritsJob.start();

  MentionCheckerQueue.run();
  MeritsCheckerQueue.run();
});
