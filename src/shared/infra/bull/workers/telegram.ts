import { createConnection } from 'typeorm';
import { container } from 'tsyringe';
import { Job, Worker } from 'bullmq';

import logger from '../../../services/logger';
import cacheConfig from '../../../../config/cache';
import telegramQueue from '../queues/telegramQueue';

import SendMentionNotificationService from '../../telegram/services/SendMentionNotificationService';
import SendMeritNotificationService from '../../telegram/services/SendMeritNotificationService';
import SendTrackedTopicNotificationService from '../../telegram/services/SendTrackedTopicNotificationService';
import SendTrackedPhraseNotificationService from '../../telegram/services/SendTrackedPhraseNotificationService';
import SendRemovedTopicNotificationService from '../../telegram/services/SendRemovedTopicNotificationService';
import SendTrackedBoardNotificationService from '../../telegram/services/SendTrackedBoardNotificationService';
import SendTrackedUserNotificationService from '../../telegram/services/SendTrackedUserNotificationService';
import SendApiNotificationService from '../../telegram/services/SendApiNotificationService';

type JobRecipes = Record<string, (job: Job) => Promise<any>>;

const jobRecipes: JobRecipes = {
  sendMentionNotification: async (job: Job) => {
    const { post, user, history } = job.data;
    const sendMentionNotification = new SendMentionNotificationService();
    await sendMentionNotification.execute(user.telegram_id, post, history);
  },
  sendMeritNotification: async (job: Job) => {
    const { merit, user } = job.data;
    const sendMeritNotification = container.resolve(SendMeritNotificationService);
    await sendMeritNotification.execute(user.telegram_id, merit);
  },
  sendTopicTrackingNotification: async (job: Job) => {
    const { post, user } = job.data;
    const sendTrackedTopicNotification = new SendTrackedTopicNotificationService();
    await sendTrackedTopicNotification.execute(user.telegram_id, post);
  },
  sendRemovedTopicNotification: async (job: Job) => {
    const { postsDeleted, user, modLog } = job.data;
    const sendRemovedTopicNotification = new SendRemovedTopicNotificationService();
    await sendRemovedTopicNotification.execute(user.telegram_id, postsDeleted, modLog);
  },
  sendPhraseTrackingNotification: async (job: Job) => {
    const { post, user, trackedPhrase } = job.data;
    const sendTrackedPhraseNotification = new SendTrackedPhraseNotificationService();
    await sendTrackedPhraseNotification.execute(user.telegram_id, post, trackedPhrase?.phrase);
  },
  sendTrackedBoardNotification: async (job: Job) => {
    const { post, user, trackedBoard } = job.data;
    const sendTrackedBoardNotification = new SendTrackedBoardNotificationService();
    await sendTrackedBoardNotification.execute(user.telegram_id, post, trackedBoard);
  },
  sendTrackedUserNotification: async (job: Job) => {
    const { post, user } = job.data;
    const sendTrackedBoardNotification = new SendTrackedUserNotificationService();
    await sendTrackedBoardNotification.execute(user.telegram_id, post);
  },
  sendApiNotification: async (job: Job) => {
    const { telegram_id, message } = job.data;
    const sendApiNotification = new SendApiNotificationService();
    await sendApiNotification.execute(telegram_id, message);
  }
};

const telegram = async () => {
  await createConnection();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const worker = new Worker(
    telegramQueue.name,
    async (job: Job) => {
      const jobRecipe = jobRecipes[job.name];

      if (!jobRecipe) {
        throw Error(`No job recipe for ${job.name}`);
      }

      await jobRecipe(job);
    },
    { connection: cacheConfig.config.redis, limiter: { max: 10, duration: 1000 } }
  );

  worker.on('active', async (job: Job) => {
    logger.info({ jobId: job.id, data: job.data }, `[${worker.name}][Worker] Active ${job.name}`);
  });

  worker.on('completed', async (job: Job) => {
    logger.info(
      { jobId: job.id, value: job.returnvalue, data: job.data },
      `[${worker.name}][Worker] Completed ${job.name}`
    );
  });

  worker.on('failed', async ({ failedReason, id }, error) => {
    logger.warn({ jobId: id, error }, `[${worker.name}][Worker] Failed for ${failedReason}`);
  });

  worker.on('error', async error => {
    logger.error({ error }, `[${worker.name}][Worker] Error`);
  });
};

telegram();
