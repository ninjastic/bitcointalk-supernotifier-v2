import Queue from 'bull';

import cacheConfig from '../../../../config/cache';

class CheckMeritsJob {
  public async start(): Promise<void> {
    const queue = new Queue('meritsChecker', {
      redis: cacheConfig.config.redis,
    });

    await queue.add('checkMerits', null, {
      removeOnComplete: true,
      removeOnFail: true,
      repeat: { every: 5000 },
    });
  }
}

export default new CheckMeritsJob();
