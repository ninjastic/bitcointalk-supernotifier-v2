import Queue from 'bull';

import cacheConfig from '../../../../config/cache';

class CheckMentionsJob {
  public async start(): Promise<void> {
    const queue = new Queue('mentionsChecker', {
      redis: cacheConfig.config.redis,
    });

    await queue.add('checkMentions', null, {
      removeOnComplete: true,
      removeOnFail: true,
      repeat: { every: 5000 },
    });
  }
}

export default new CheckMentionsJob();
