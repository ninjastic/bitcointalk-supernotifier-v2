import { Queue, QueueEvents } from 'bullmq';

import cacheConfig from '../../../../config/cache';
import { RecipeData, RecipeNames } from '../types/telegram';

const telegramQueue = new Queue<RecipeData[RecipeNames], any, RecipeNames>('TelegramQueue', {
  connection: cacheConfig.config.redis,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: true
  }
});

export const addTelegramJob = <T extends RecipeNames>(recipe: T, data: RecipeData[T]) =>
  telegramQueue.add(recipe, data);

export const queueEvents = new QueueEvents(telegramQueue.name, { connection: cacheConfig.config.redis });

export default telegramQueue;
