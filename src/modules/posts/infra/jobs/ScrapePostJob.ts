import Queue from 'bull';

import Post from '../schemas/Post';

import cacheConfig from '../../../../config/cache';

import ScrapePostDTO from '../../dtos/ScrapePostDTO';

export default class ScrapePostJob {
  public async start({ topic_id, post_id }: ScrapePostDTO): Promise<Post> {
    const queue = new Queue('forumScrapper', {
      redis: cacheConfig.config.redis,
      limiter: {
        max: 1,
        duration: 1000,
      },
    });

    const job = await queue.add(
      'scrapePost',
      { topic_id, post_id },
      {
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    return job.finished();
  }
}
