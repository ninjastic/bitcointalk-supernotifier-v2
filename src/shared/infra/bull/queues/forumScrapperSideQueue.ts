import Queue from 'bull';

import cacheConfig from '../../../../config/cache';
import loggerHandler from '../handlers/loggerHandler';

const forumScrapperSideQueue = new Queue('ForumScrapperSideQueue', {
  redis: cacheConfig.config.redis,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
  limiter: {
    max: 1,
    duration: 1000
  }
});

loggerHandler(forumScrapperSideQueue);

export default forumScrapperSideQueue;
