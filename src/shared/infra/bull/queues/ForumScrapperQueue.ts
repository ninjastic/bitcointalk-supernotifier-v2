import Queue, { Job } from 'bull';
import { container } from 'tsyringe';

import cacheConfig from '../../../../config/cache';
import logger from '../../../services/logger';

import ScrapePostDTO from '../../../../modules/posts/dtos/ScrapePostDTO';

import ScrapeMeritsRepository from '../../../../modules/merits/infra/repositories/ScrapeMeritsRepository';
import ScrapePostsRepository from '../../../../modules/posts/infra/repositories/ScrapePostsRepository';

import SavePostService from '../../../../modules/posts/services/SavePostService';

interface ScrapePostJob extends Job {
  data: ScrapePostDTO;
}

class ForumScrapperQueue {
  queue: Queue.Queue;

  scrapeMeritsRepository: ScrapeMeritsRepository;

  scrapePostsRepository: ScrapePostsRepository;

  constructor() {
    this.init();
  }

  init(): void {
    this.queue = new Queue('forumScrapper', {
      redis: cacheConfig.config.redis,
      limiter: {
        max: 1,
        duration: 1000,
      },
    });

    this.scrapeMeritsRepository = new ScrapeMeritsRepository();
    this.scrapePostsRepository = new ScrapePostsRepository();
  }

  public run(): void {
    const savePostService = container.resolve(SavePostService);

    this.queue.process('scrapeRecentPosts', async () => {
      await this.scrapePostsRepository.scrapeRecent();
    });

    this.queue.process('scrapeMerits', async () => {
      await this.scrapeMeritsRepository.scrapeMerits();
    });

    this.queue.process('scrapePost', async (job: ScrapePostJob) => {
      const post = await this.scrapePostsRepository.scrapePost({
        topic_id: job.data.topic_id,
        post_id: job.data.post_id,
      });

      await savePostService.execute(post);

      return post;
    });

    this.queue.on('active', job => {
      logger.info({ data: job.data }, 'Starting job %s', job.name);
    });

    this.queue.on('error', err => {
      logger.error(err.message);
    });

    this.queue.on('failed', err => {
      logger.error(err.failedReason);
    });
  }
}

export default new ForumScrapperQueue();
