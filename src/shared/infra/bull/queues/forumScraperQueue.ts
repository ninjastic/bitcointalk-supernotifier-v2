import { Queue, QueueEvents } from 'bullmq';

import cacheConfig from '../../../../config/cache';

const forumScraperQueue = new Queue('ForumScraperQueue', {
  connection: cacheConfig.config.redis,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true }
});

export const queueEvents = new QueueEvents(forumScraperQueue.name, { connection: cacheConfig.config.redis });

export default forumScraperQueue;
