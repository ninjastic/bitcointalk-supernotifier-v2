import Post from '../typeorm/entities/Post';
import ScrapePostDTO from '../../dtos/ScrapePostDTO';
import forumScraperQueue, { queueEvents } from '../../../../shared/infra/bull/queues/forumScraperQueue';

export default class ScrapePostJob {
  public async start({ post_id }: ScrapePostDTO): Promise<Post> {
    const job = await forumScraperQueue.add('scrapePost', { post_id });
    const jobResult = await job.waitUntilFinished(queueEvents);
    return jobResult;
  }
}
