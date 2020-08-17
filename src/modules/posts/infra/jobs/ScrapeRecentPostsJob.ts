import Queue from 'bull';

import cacheConfig from '../../../../config/cache';

class ScrapeRecentPostsJob {
  public async start(): Promise<void> {
    const queue = new Queue('forumScrapper', {
      redis: cacheConfig.config.redis,
      limiter: {
        max: 1,
        duration: 1000,
      },
    });

    await queue.add('scrapeRecentPosts', null, {
      repeat: { every: 5000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
}

export default new ScrapeRecentPostsJob();
