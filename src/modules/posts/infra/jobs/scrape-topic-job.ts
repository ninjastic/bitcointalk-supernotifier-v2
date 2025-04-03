import { ParsedPost } from '##/modules/posts/services/scraper/parse-post-html';
import { addForumScraperJob, queueEvents } from '##/shared/infra/bull/queues/forumScraperQueue';

const scrapeTopicJob = async (topicId: number): Promise<ParsedPost> => {
  const job = await addForumScraperJob('scrapeTopic', { topic_id: topicId });
  const result = await job.waitUntilFinished(queueEvents);
  return result;
};

export default scrapeTopicJob;
