import Queue from 'bull';

import cacheConfig from '../../../../config/cache';

class ScrapeMeritsJob {
  public async start(): Promise<void> {
    const queue = new Queue('forumScrapper', {
      redis: cacheConfig.config.redis,
      limiter: {
        max: 1,
        duration: 1000,
      },
    });

    await queue.add('scrapeMerits', null, {
      repeat: { every: 15000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
}

export default new ScrapeMeritsJob();
