import { Queue } from 'bull';

import logger from '../../../services/logger';

const loggerHandler = (queue: Queue): void => {
  queue.on('active', job => {
    logger.info(
      {
        queue: queue.name,
        data: job.data
      },
      'Starting job %s',
      job.name
    );
  });

  queue.on('completed', job => {
    logger.info(
      {
        queue: queue.name,
        data: job.data,
        returnValue: job.returnvalue
      },
      'Completed job %s',
      job.name
    );
  });

  queue.on('failed', job => {
    logger.error(
      {
        queue: queue.name,
        reason: job.failedReason,
        stacktrace: job.stacktrace,
        data: job.data
      },
      'Job failed %s',
      job.name
    );
  });

  queue.on('error', error => {
    logger.error(
      {
        queue: queue.name,
        error: error.message,
        stack: error.stack
      },
      'Queue error'
    );
  });
};

export default loggerHandler;
