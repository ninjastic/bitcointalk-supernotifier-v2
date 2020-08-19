import { Queue } from 'bull';

import logger from '../../../services/logger';

const loggerHandler = (queue: Queue): void => {
  queue.on('active', job => {
    logger.info({ data: job.data }, 'Starting job %s', job.name);
  });

  queue.on('failed', job => {
    logger.error({ data: job.failedReason }, 'Job failed %s', job.name);
  });

  queue.on('error', err => {
    logger.error({ data: err }, 'Job error');
  });
};

export default loggerHandler;