import { Job, JobsOptions, Queue, QueueEvents } from 'bullmq';

import cacheConfig from '../../../../config/cache';
import { ParsedPost } from '##/modules/posts/services/scraper/parse-post-html';
import PostVersion from '##/modules/posts/infra/typeorm/entities/PostVersion';

export type ForumScraperQueueRecipes = {
  scrapePost: { input: { post_id: number }; output: ParsedPost };
  scrapeTopic: { input: { topic_id: number }; output: ParsedPost };
  scrapeUserMeritCount: { input: { uid: number }; output: number };
  scrapePostForChanges: { input: { post_id: number }; output: PostVersion };
};

export type ForumScraperQueueJobName = keyof ForumScraperQueueRecipes;
export type ForumScraperQueueInput<T extends ForumScraperQueueJobName = any> = ForumScraperQueueRecipes[T]['input'];
export type ForumScraperQueueOutput<T extends ForumScraperQueueJobName = any> = ForumScraperQueueRecipes[T]['output'];

export type ForumScraperQueue = Queue<
  ForumScraperQueueInput<any>,
  ForumScraperQueueOutput<any>,
  ForumScraperQueueJobName
>;

export type JobRecipes = {
  [K in ForumScraperQueueJobName]: (
    job: Job<ForumScraperQueueRecipes[K]['input'], ForumScraperQueueRecipes[K]['output'], K>
  ) => Promise<ForumScraperQueueRecipes[K]['output']>;
};

const forumScraperQueue: ForumScraperQueue = new Queue('ForumScraperQueue', {
  connection: cacheConfig.config.redis,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true }
});

export const addForumScraperJob = async <T extends ForumScraperQueueJobName>(
  jobName: T,
  data: ForumScraperQueueRecipes[T]['input'],
  opts: JobsOptions = {}
): Promise<Job<ForumScraperQueueInput<T>, ForumScraperQueueOutput<T>, ForumScraperQueueJobName>> => {
  return forumScraperQueue.add(jobName, data, opts);
};

export const queueEvents = new QueueEvents(forumScraperQueue.name, { connection: cacheConfig.config.redis });

export default forumScraperQueue;
