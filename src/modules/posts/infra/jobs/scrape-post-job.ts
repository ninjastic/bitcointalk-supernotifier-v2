import { ParsedPost } from '##/modules/posts/services/scraper/parse-post-html';
import { addForumScraperJob, queueEvents } from '##/shared/infra/bull/queues/forumScraperQueue';

const scrapePostJob = async (postId: number): Promise<ParsedPost> => {
  const job = await addForumScraperJob('scrapePost', { post_id: postId });
  const result = await job.waitUntilFinished(queueEvents);
  return result;
};

export default scrapePostJob;
