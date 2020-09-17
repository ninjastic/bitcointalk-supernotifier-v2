import Queue from 'bull';

import cacheConfig from '../../../../config/cache';

import Post from '../typeorm/entities/Post';
import ScrapePostDTO from '../../dtos/ScrapePostDTO';

export default class ScrapePostJob {
  public async start({ topic_id, post_id }: ScrapePostDTO): Promise<Post> {
    const queue = new Queue('ForumScrapperSideQueue', {
      redis: cacheConfig.config.redis,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
    });

    const job = await queue.add('scrapePost', { topic_id, post_id });

    const jobResults = await job.finished();

    await queue.close();

    return jobResults;
  }
}
