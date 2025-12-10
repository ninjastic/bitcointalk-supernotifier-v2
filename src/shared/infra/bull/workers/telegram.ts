import 'reflect-metadata';
import 'module-alias/register';
import 'dotenv/config';
import { createConnection } from 'typeorm';
import { container } from 'tsyringe';
import type { Job } from 'bullmq';
import { Worker } from 'bullmq';

import '##/shared/container';
import TelegramBot from '##/shared/infra/telegram/bot';
import logger from '../../../services/logger';
import cacheConfig from '../../../../config/cache';
import telegramQueue from '../queues/telegramQueue';
import type { JobRecipe } from '../types/telegram';

import SendMentionNotificationService from '../../telegram/services/notifications/SendMentionNotificationService';
import SendMeritNotificationService from '../../telegram/services/notifications/SendMeritNotificationService';
import SendTrackedTopicNotificationService from '../../telegram/services/notifications/SendTrackedTopicNotificationService';
import SendTrackedPhraseNotificationService from '../../telegram/services/notifications/SendTrackedPhraseNotificationService';
import SendRemovedTopicNotificationService from '../../telegram/services/notifications/SendRemovedTopicNotificationService';
import SendTrackedBoardNotificationService from '../../telegram/services/notifications/SendTrackedBoardNotificationService';
import SendTrackedUserNotificationService from '../../telegram/services/notifications/SendTrackedUserNotificationService';
import SendApiNotificationService from '../../telegram/services/notifications/SendApiNotificationService';
import SendAutoTrackTopicNotificationService from '../../telegram/services/notifications/SendAutoTrackTopicNotificationService';

container.registerSingleton('TelegramBot', TelegramBot);
const bot = container.resolve<TelegramBot>('TelegramBot');

const jobRecipes: JobRecipe = {
  sendMentionNotification: async job => {
    const { user, post, history, mentionType } = job.data;
    const sendMentionNotification = container.resolve(SendMentionNotificationService);
    await sendMentionNotification.execute({ bot, user, post, history, mentionType });
  },
  sendMeritNotification: async job => {
    const { merit, user, scrapedPostTitle = null } = job.data;
    const sendMeritNotification = container.resolve(SendMeritNotificationService);
    await sendMeritNotification.execute({ bot, telegramId: user.telegram_id, merit, scrapedPostTitle });
  },
  sendTopicTrackingNotification: async job => {
    const { post, user } = job.data;
    const sendTrackedTopicNotification = container.resolve(SendTrackedTopicNotificationService);
    await sendTrackedTopicNotification.execute({ bot, telegramId: user.telegram_id, post });
  },
  sendRemovedTopicNotification: async job => {
    const { postsDeleted, user, modLog } = job.data;
    const sendRemovedTopicNotification = container.resolve(SendRemovedTopicNotificationService);
    await sendRemovedTopicNotification.execute({ bot, telegramId: user.telegram_id, posts: postsDeleted, modLog });
  },
  sendPhraseTrackingNotification: async job => {
    const { post, user, trackedPhrase } = job.data;
    const sendTrackedPhraseNotification = container.resolve(SendTrackedPhraseNotificationService);
    await sendTrackedPhraseNotification.execute({
      bot,
      telegramId: user.telegram_id,
      post,
      phrase: trackedPhrase.phrase
    });
  },
  sendTrackedBoardNotification: async job => {
    const { post, user, trackedBoard } = job.data;
    const sendTrackedBoardNotification = container.resolve(SendTrackedBoardNotificationService);
    await sendTrackedBoardNotification.execute({ bot, telegramId: user.telegram_id, post, trackedBoard });
  },
  sendTrackedUserNotification: async job => {
    const { post, user } = job.data;
    const sendTrackedBoardNotification = container.resolve(SendTrackedUserNotificationService);
    await sendTrackedBoardNotification.execute({ bot, telegramId: user.telegram_id, post });
  },
  sendApiNotification: async job => {
    const { telegram_id, message } = job.data;
    const sendApiNotification = container.resolve(SendApiNotificationService);
    await sendApiNotification.execute({ bot, telegramId: telegram_id, message });
  },
  sendAutoTrackTopicRequestNotification: async job => {
    const { topic, user } = job.data;
    const sendAutoTrackTopicRequestNotification = container.resolve(SendAutoTrackTopicNotificationService);
    await sendAutoTrackTopicRequestNotification.execute({ bot, telegramId: user.telegram_id, topic });
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
    {
      connection: { ...cacheConfig.config.redis, connectionName: 'TelegramQueue' },
      limiter: { max: 10, duration: 1000 }
    }
  );

  worker.on('active', async (job: Job) => {
    logger.debug(
      { jobName: job.name, jobId: job.id, data: job.data },
      `[${worker.name}][Worker][${job.id}] Active ${job.name}`
    );
  });

  worker.on('completed', async (job: Job) => {
    logger.debug(
      { jobName: job.name, jobId: job.id, value: job.returnvalue, data: job.data },
      `[${worker.name}][Worker][${job.id}] Completed ${job.name}`
    );
  });

  worker.on('failed', async ({ failedReason, id, name }, error) => {
    logger.warn({ jobName: name, jobId: id, error }, `[${worker.name}][Worker][${id}] Failed for ${failedReason}`);
  });

  worker.on('error', async error => {
    logger.error(error, `[${worker.name}][Worker] Error`);
  });

  process.on('SIGINT', async () => {
    if (process.env.NODE_ENV === 'production' && bot.runner.isRunning()) {
      await bot.runner.stop();
    }

    process.exit(0);
  });
};

telegram();
