import Post from '../schemas/Post';

import forumScrapperQueue from '../../../../shared/infra/bull/queues/ForumScrapperQueue';

import ScrapePostDTO from '../../dtos/ScrapePostDTO';

export default class ScrapePostJob {
  public async start({ topic_id, post_id }: ScrapePostDTO): Promise<Post> {
    const { queue } = forumScrapperQueue;

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
