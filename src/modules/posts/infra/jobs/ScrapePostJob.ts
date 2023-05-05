import Post from '../typeorm/entities/Post';
import ScrapePostDTO from '../../dtos/ScrapePostDTO';
import forumScrapperSideQueue from '../../../../shared/infra/bull/queues/forumScrapperSideQueue';

export default class ScrapePostJob {
  public async start({ topic_id, post_id }: ScrapePostDTO): Promise<Post> {
    const job = await forumScrapperSideQueue.add('scrapePost', { topic_id, post_id });
    const jobResults = await job.finished();
    return jobResults;
  }
}
