import Queue from 'bull';
import { container } from 'tsyringe';

import cacheConfig from '../../../../config/cache';

import CheckMentionsService from '../../../../modules/posts/services/CheckMentionsService';

class MentionCheckerQueue {
  queue: Queue.Queue;

  constructor() {
    this.init();
  }

  init(): void {
    this.queue = new Queue('mentionsChecker', {
      redis: cacheConfig.config.redis,
    });
  }

  public run(): void {
    const checkMentions = container.resolve(CheckMentionsService);

    this.queue.process('checkMentions', async () => {
      await checkMentions.execute();
    });

    this.queue.on('error', err => {
      console.log(err.message);
    });

    this.queue.on('failed', err => {
      console.log(err.failedReason);
    });
  }
}

export default new MentionCheckerQueue();
