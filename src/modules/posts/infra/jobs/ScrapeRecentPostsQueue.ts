import Queue from 'bull';
import ScrapePostsRepository from '../repositories/ScrapePostsRepository';
import cacheConfig from '../../../../config/cache';

export default class ScrapeRecentPostsQueue {
  public async run(): Promise<void> {
    const scrapePostRepository = new ScrapePostsRepository();

    const scrapeRecentPostsQueue = new Queue('scrape recent posts', {
      redis: cacheConfig.config.redis,
      limiter: {
        max: 1,
        duration: 1000,
      },
    });

    scrapeRecentPostsQueue.process(async () => {
      await scrapePostRepository.scrapeRecent();
    });

    scrapeRecentPostsQueue.on('error', err => {
      console.log(err.message);
    });

    scrapeRecentPostsQueue.on('failed', err => {
      console.log(err.failedReason);
    });

    scrapeRecentPostsQueue.add(
      { type: 'recent' },
      {
        repeat: { every: 5000 },
      },
    );
  }
}
