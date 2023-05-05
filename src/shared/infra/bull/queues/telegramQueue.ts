import Queue from 'bull';

import cacheConfig from '../../../../config/cache';
import loggerHandler from '../handlers/loggerHandler';

const telegramQueue = new Queue('TelegramQueue', {
  redis: cacheConfig.config.redis,
  limiter: {
    max: 1,
    duration: 200
  },
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: true
  }
});

loggerHandler(telegramQueue);

export default telegramQueue;
