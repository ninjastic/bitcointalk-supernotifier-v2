import { createConnection } from 'typeorm';
import { container } from 'tsyringe';
import { Job, Worker } from 'bullmq';

import logger from '../../../services/logger';
import cacheConfig from '../../../../config/cache';
import telegramQueue from '../queues/telegramQueue';
import { JobRecipe } from '../types/telegram';

import SendMentionNotificationService from '../../telegram/services/notifications/SendMentionNotificationService';
import SendMeritNotificationService from '../../telegram/services/notifications/SendMeritNotificationService';
import SendTrackedTopicNotificationService from '../../telegram/services/notifications/SendTrackedTopicNotificationService';
import SendTrackedPhraseNotificationService from '../../telegram/services/notifications/SendTrackedPhraseNotificationService';
import SendRemovedTopicNotificationService from '../../telegram/services/notifications/SendRemovedTopicNotificationService';
import SendTrackedBoardNotificationService from '../../telegram/services/notifications/SendTrackedBoardNotificationService';
import SendTrackedUserNotificationService from '../../telegram/services/notifications/SendTrackedUserNotificationService';
import SendApiNotificationService from '../../telegram/services/notifications/SendApiNotificationService';
import SendAutoTrackTopicNotificationService from '../../telegram/services/notifications/SendAutoTrackTopicNotificationService';

const jobRecipes: JobRecipe = {
  sendMentionNotification: async job => {
    const { user, post, history } = job.data;
    const sendMentionNotification = container.resolve(SendMentionNotificationService);
    await sendMentionNotification.execute({ telegramId: user.telegram_id, post, history });
  },
  sendMeritNotification: async job => {
    const { merit, user } = job.data;
    const sendMeritNotification = container.resolve(SendMeritNotificationService);
    await sendMeritNotification.execute({ telegramId: user.telegram_id, merit });
  },
  sendTopicTrackingNotification: async job => {
    const { post, user } = job.data;
    const sendTrackedTopicNotification = container.resolve(SendTrackedTopicNotificationService);
    await sendTrackedTopicNotification.execute({ telegramId: user.telegram_id, post });
  },
  sendRemovedTopicNotification: async job => {
    const { postsDeleted, user, modLog } = job.data;
    const sendRemovedTopicNotification = container.resolve(SendRemovedTopicNotificationService);
    await sendRemovedTopicNotification.execute({ telegram_id: user.telegram_id, posts: postsDeleted, modLog });
  },
  sendPhraseTrackingNotification: async job => {
    const { post, user, trackedPhrase } = job.data;
    const sendTrackedPhraseNotification = container.resolve(SendTrackedPhraseNotificationService);
    await sendTrackedPhraseNotification.execute({ telegramId: user.telegram_id, post, phrase: trackedPhrase.phrase });
  },
  sendTrackedBoardNotification: async job => {
    const { post, user, trackedBoard } = job.data;
    const sendTrackedBoardNotification = container.resolve(SendTrackedBoardNotificationService);
    await sendTrackedBoardNotification.execute({ telegramId: user.telegram_id, post, trackedBoard });
  },
  sendTrackedUserNotification: async job => {
    const { post, user } = job.data;
    const sendTrackedBoardNotification = container.resolve(SendTrackedUserNotificationService);
    await sendTrackedBoardNotification.execute({ telegram_id: user.telegram_id, post });
  },
  sendApiNotification: async job => {
    const { telegram_id, message } = job.data;
    const sendApiNotification = container.resolve(SendApiNotificationService);
    await sendApiNotification.execute({ telegramId: telegram_id, message });
  },
  sendAutoTrackTopicRequestNotification: async job => {
    const { topic, user } = job.data;
    const sendAutoTrackTopicRequestNotification = container.resolve(SendAutoTrackTopicNotificationService);
    await sendAutoTrackTopicRequestNotification.execute({ telegramId: user.telegram_id, topic });
  }
};

const telegram = async () => {
  await createConnection();

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
    logger.debug({ jobId: job.id, data: job.data }, `[${worker.name}][Worker][${job.id}] Active ${job.name}`);
  });

  worker.on('completed', async (job: Job) => {
    logger.debug(
      { jobId: job.id, value: job.returnvalue, data: job.data },
      `[${worker.name}][Worker][${job.id}] Completed ${job.name}`
    );
  });

  worker.on('failed', async ({ failedReason, id }, error) => {
    logger.warn({ jobId: id, error }, `[${worker.name}][Worker][${id}] Failed for ${failedReason}`);
  });

  worker.on('error', async error => {
    logger.error(error, `[${worker.name}][Worker] Error`);
  });
};

telegram();
