import { ParsedPost } from '##/modules/posts/services/scraper/parse-post-html';
import { addForumScraperJob, queueEvents } from '##/shared/infra/bull/queues/forumScraperQueue';
import { JobsOptions } from 'bullmq';

const scrapeTopicJob = async (topicId: number, opts: JobsOptions = {}): Promise<ParsedPost> => {
  const job = await addForumScraperJob('scrapeTopic', { topic_id: topicId }, opts);
  const result = await job.waitUntilFinished(queueEvents);
  return result;
};

export default scrapeTopicJob;
