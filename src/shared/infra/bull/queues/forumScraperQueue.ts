import type PostVersion from '##/modules/posts/infra/typeorm/entities/PostVersion';
import type { ParsedPost } from '##/modules/posts/services/scraper/parse-post-html';
import type { ParsedTopicPost } from '##/modules/posts/services/scraper/parse-topic-post-op-html';
import type { Job, JobsOptions } from 'bullmq';

import { Queue, QueueEvents } from 'bullmq';

import cacheConfig from '../../../../config/cache';

export interface ForumScraperQueueRecipes {
  scrapePost: { input: { post_id: number }; output: ParsedPost };
  scrapeTopic: { input: { topic_id: number }; output: ParsedTopicPost };
  scrapeUserMeritCount: { input: { uid: number }; output: number };
  scrapePostForChanges: { input: { post_id: number }; output: PostVersion[] };
}

export type ForumScraperQueueJobName = keyof ForumScraperQueueRecipes;

export type ForumScraperQueueInput<T extends ForumScraperQueueJobName> = ForumScraperQueueRecipes[T]['input'];

export type ForumScraperQueueOutput<T extends ForumScraperQueueJobName> = ForumScraperQueueRecipes[T]['output'];

export type ForumScraperQueue = Queue<
  ForumScraperQueueInput<any>,
  ForumScraperQueueOutput<any>,
  ForumScraperQueueJobName
>;

export type JobRecipes = {
  [K in ForumScraperQueueJobName]: (
    job: Job<ForumScraperQueueInput<K>, ForumScraperQueueOutput<K>, K>,
  ) => Promise<ForumScraperQueueOutput<K>>;
};

type ForumScraperJob<T extends ForumScraperQueueJobName> = Job<
  ForumScraperQueueInput<T>,
  ForumScraperQueueOutput<T>,
  T
>;

const QUEUE_NAME = 'ForumScraperQueue';

const forumScraperQueue: ForumScraperQueue = new Queue(QUEUE_NAME, {
  connection: {
    ...cacheConfig.config.redis,
    connectionName: 'ForumScraperQueue:Producer',
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: { count: 1000, age: 24 * 3600 },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export const queueEvents = new QueueEvents(QUEUE_NAME, {
  connection: {
    ...cacheConfig.config.redis,
    connectionName: 'ForumScraperQueue:Events',
  },
});

export async function addForumScraperJob<T extends ForumScraperQueueJobName>(
  jobName: T,
  data: ForumScraperQueueInput<T>,
  waitUntilFinished: true,
  opts?: JobsOptions,
): Promise<ForumScraperQueueOutput<T>>;

export async function addForumScraperJob<T extends ForumScraperQueueJobName>(
  jobName: T,
  data: ForumScraperQueueInput<T>,
  waitUntilFinished?: false,
  opts?: JobsOptions,
): Promise<ForumScraperJob<T>>;

export async function addForumScraperJob<T extends ForumScraperQueueJobName>(
  jobName: T,
  data: ForumScraperQueueInput<T>,
  waitUntilFinished?: boolean,
  opts: JobsOptions = {},
): Promise<ForumScraperQueueOutput<T> | ForumScraperJob<T>> {
  const jobOptions: JobsOptions = { ...forumScraperQueue.defaultJobOptions, ...opts };

  const job = await forumScraperQueue.add(jobName, data, jobOptions);

  if (waitUntilFinished) {
    const result = await job.waitUntilFinished(queueEvents);
    return result as ForumScraperQueueOutput<T>;
  }
  else {
    return job as ForumScraperJob<T>;
  }
}

export default forumScraperQueue;
