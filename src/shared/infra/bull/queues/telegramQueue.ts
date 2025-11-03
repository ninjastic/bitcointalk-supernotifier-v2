import { Queue, QueueEvents } from 'bullmq';

import cacheConfig from '../../../../config/cache';
import type { RecipeMetadata, RecipeNames } from '../types/telegram';

const telegramQueue = new Queue<RecipeMetadata[RecipeNames], any, RecipeNames>('TelegramQueue', {
  connection: { ...cacheConfig.config.redis, connectionName: 'TelegramQueue' },
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: true
  }
});

export const addTelegramJob = async <T extends RecipeNames>(recipe: T, data: RecipeMetadata[T]) =>
  telegramQueue.add(recipe, data);

export const queueEvents = new QueueEvents(telegramQueue.name, {
  connection: { ...cacheConfig.config.redis, connectionName: 'TelegramQueueEvents' }
});

export default telegramQueue;
