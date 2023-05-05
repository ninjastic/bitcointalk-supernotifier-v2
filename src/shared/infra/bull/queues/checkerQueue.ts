import Queue from 'bull';

import cacheConfig from '../../../../config/cache';
import loggerHandler from '../handlers/loggerHandler';

const checkerQueue = new Queue('CheckerQueue', {
  redis: cacheConfig.config.redis,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true }
});

loggerHandler(checkerQueue);

export default checkerQueue;
