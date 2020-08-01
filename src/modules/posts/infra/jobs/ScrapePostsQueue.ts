import Queue, { Job } from 'bull';
import { container } from 'tsyringe';

import cacheConfig from '../../../../config/cache';

import ScrapePostService from '../../services/ScrapePostService';
import SavePostService from '../../services/SavePostService';

import Post from '../schemas/Post';

interface ScrapePostsJobData {
  topic_id: number;
  post_id: number;
}

interface ScrapePostsJob extends Job {
  data: {
    topic_id: number;
    post_id: number;
  };
}

export default class ScrapePostsQueue {
  public async run({ topic_id, post_id }: ScrapePostsJobData): Promise<Post> {
    const scrapePostService = container.resolve(ScrapePostService);
    const savePostService = container.resolve(SavePostService);

    const scrapePostsQueue = new Queue('scrape posts', {
      redis: cacheConfig.config.redis,
      limiter: {
        max: 1,
        duration: 1000,
      },
    });

    scrapePostsQueue.process(async (job: ScrapePostsJob) => {
      const post = await scrapePostService.execute({
        topic_id: job.data.topic_id,
        post_id: job.data.post_id,
      });

      await savePostService.execute(post);

      return post;
    });

    scrapePostsQueue.on('error', err => {
      console.log(err.message);
    });

    scrapePostsQueue.on('failed', err => {
      console.log(err.failedReason);
    });

    const job = await scrapePostsQueue.add({ topic_id, post_id });

    return job.finished();
  }
}
