import { Queue } from 'bull';

import logger from '../../../services/logger';

const loggerHandler = (queue: Queue): void => {
  queue.on('active', job => {
    logger.info(
      {
        queue: queue.name,
        job: {
          name: job.name,
          id: job.id
        },
        data: job.data
      },
      'Starting job'
    );
  });

  queue.on('completed', job => {
    logger.info(
      {
        queue: queue.name,
        job: {
          name: job.name,
          id: job.id
        },
        returnValue: job.returnvalue
      },
      'Completed job'
    );
  });

  queue.on('failed', job => {
    logger.error(
      {
        queue: queue.name,
        job: {
          name: job.name,
          id: job.id
        },
        reason: job.failedReason,
        stacktrace: job.stacktrace
      },
      'Job failed'
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
