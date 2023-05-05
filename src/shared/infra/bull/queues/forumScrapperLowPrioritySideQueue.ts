import Queue from 'bull';

import cacheConfig from '../../../../config/cache';
import loggerHandler from '../handlers/loggerHandler';

const forumScrapperLowPrioritySideQueue = new Queue('ForumScrapperLowPrioritySideQueue', {
  redis: cacheConfig.config.redis,
  limiter: {
    max: 1,
    duration: 1000
  },
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true }
});

loggerHandler(forumScrapperLowPrioritySideQueue);

export default forumScrapperLowPrioritySideQueue;
