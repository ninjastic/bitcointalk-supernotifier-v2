import { Queue, QueueEvents } from 'bullmq';

import cacheConfig from '../../../../config/cache';

const telegramQueue = new Queue('TelegramQueue', {
  connection: cacheConfig.config.redis,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: true
  }
});

export const queueEvents = new QueueEvents(telegramQueue.name, { connection: cacheConfig.config.redis });

export default telegramQueue;
