import Post from '../typeorm/entities/Post';
import ScrapePostDTO from '../../dtos/ScrapePostDTO';
import forumScraperQueue, { queueEvents } from '../../../../shared/infra/bull/queues/forumScraperQueue';

export default class ScrapePostJob {
  public async start({ topic_id, post_id }: ScrapePostDTO): Promise<Post> {
    const job = await forumScraperQueue.add('scrapePost', { topic_id, post_id });
    const jobResult = await job.waitUntilFinished(queueEvents);
    return jobResult;
  }
}
