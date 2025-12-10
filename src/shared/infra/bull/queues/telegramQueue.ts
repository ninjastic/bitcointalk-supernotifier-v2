import { Queue, QueueEvents } from 'bullmq';

import type { RecipeMetadata, RecipeNames } from '../types/telegram';

import cacheConfig from '../../../../config/cache';

const telegramQueue = new Queue<RecipeMetadata[RecipeNames], any, RecipeNames>('TelegramQueue', {
  connection: { ...cacheConfig.config.redis, connectionName: 'TelegramQueue' },
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: true,
  },
});

export async function addTelegramJob<T extends RecipeNames>(recipe: T, data: RecipeMetadata[T]) {
  return telegramQueue.add(recipe, data);
}

export const queueEvents = new QueueEvents(telegramQueue.name, {
  connection: { ...cacheConfig.config.redis, connectionName: 'TelegramQueueEvents' },
});

export default telegramQueue;
