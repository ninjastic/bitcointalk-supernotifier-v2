import Queue from 'bull';
import { container } from 'tsyringe';

import cacheConfig from '../../../../config/cache';

import CheckMeritsService from '../../../../modules/merits/services/CheckMeritsService';

class MeritsCheckerQueue {
  queue: Queue.Queue;

  constructor() {
    this.init();
  }

  init(): void {
    this.queue = new Queue('meritsChecker', {
      redis: cacheConfig.config.redis,
    });
  }

  public run(): void {
    const checkMerits = container.resolve(CheckMeritsService);

    this.queue.process('checkMerits', async () => {
      await checkMerits.execute();
    });

    this.queue.on('error', err => {
      console.log(err.message);
    });

    this.queue.on('failed', err => {
      console.log(err.failedReason);
    });
  }
}

export default new MeritsCheckerQueue();
