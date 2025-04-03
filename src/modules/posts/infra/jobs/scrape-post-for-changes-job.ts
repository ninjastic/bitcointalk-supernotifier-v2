import PostVersion from '##/modules/posts/infra/typeorm/entities/PostVersion';
import {
  addForumScraperJob,
  ForumScraperQueueRecipes,
  queueEvents
} from '##/shared/infra/bull/queues/forumScraperQueue';
import { Job } from 'bullmq';

type ScrapePostForChangesJob = Job<
  {
    post_id: number;
  },
  PostVersion,
  keyof ForumScraperQueueRecipes
>;

function scrapePostForChangesJob(postId: number, waitFinish: true): Promise<PostVersion>;
function scrapePostForChangesJob(postId: number, waitFinish?: false): Promise<ScrapePostForChangesJob>;

async function scrapePostForChangesJob(
  postId: number,
  waitFinish = false
): Promise<PostVersion | ScrapePostForChangesJob> {
  const job = await addForumScraperJob(
    'scrapePostForChanges',
    { post_id: postId },
    { jobId: `scrapePostForChanges-${postId}` }
  );
  if (waitFinish) {
    const result = await job.waitUntilFinished(queueEvents);
    return result;
  }
  return job;
}

export default scrapePostForChangesJob;
