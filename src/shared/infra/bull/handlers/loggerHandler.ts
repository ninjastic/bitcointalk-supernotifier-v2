import { Queue } from 'bull';

import logger from '../../../services/logger';

const loggerHandler = (queue: Queue): void => {
  queue.on('active', job => {
    logger.info({ data: job.data }, 'Starting job %s', job.name);
  });

  queue.on('failed', job => {
    logger.error(
      { reason: job.failedReason, stacktrace: job.stacktrace, data: job.data },
      'Job failed %s',
      job.name,
    );
  });

  queue.on('error', error => {
    logger.error({ error: error.message, stack: error.stack }, 'Job error');
  });
};

export default loggerHandler;
