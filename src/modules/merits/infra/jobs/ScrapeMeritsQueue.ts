import Queue from 'bull';
import ScrapeMeritsRepository from '../repositories/ScrapeMeritsRepository';
import cacheConfig from '../../../../config/cache';

export default class ScrapeRecentPostsQueue {
  public async run(): Promise<void> {
    const scrapeMeritsRepository = new ScrapeMeritsRepository();

    const scrapeMeritsQueue = new Queue('scrape merits', {
      redis: cacheConfig.config.redis,
      limiter: {
        max: 1,
        duration: 1000,
      },
    });

    scrapeMeritsQueue.process(async () => {
      await scrapeMeritsRepository.scrapeMerits();
    });

    scrapeMeritsQueue.on('error', err => {
      console.log(err.message);
    });

    scrapeMeritsQueue.on('failed', err => {
      console.log(err.failedReason);
    });

    scrapeMeritsQueue.add(
      { type: 'merits' },
      {
        repeat: { every: 5000 },
      },
    );
  }
}
