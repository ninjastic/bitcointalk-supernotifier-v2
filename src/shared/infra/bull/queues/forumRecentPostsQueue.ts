import Queue from 'bull';

import cacheConfig from '../../../../config/cache';
import loggerHandler from '../handlers/loggerHandler';

const forumRecentPostsQueue = new Queue('ForumRecentPostsQueue', {
  redis: cacheConfig.config.redis,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true }
});

loggerHandler(forumRecentPostsQueue);

export default forumRecentPostsQueue;
