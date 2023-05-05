import Queue from 'bull';

import cacheConfig from '../../../../config/cache';
import loggerHandler from '../handlers/loggerHandler';

const forumScrapperQueue = new Queue('ForumScrapperQueue', {
  redis: cacheConfig.config.redis,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true }
});

loggerHandler(forumScrapperQueue);

export default forumScrapperQueue;
