import 'reflect-metadata';
import 'module-alias/register';
import 'dotenv/config';
import type { Job } from 'bullmq';

import TelegramBot from '##/apps/telegram/bot';
import { Worker } from 'bullmq';
import { container } from 'tsyringe';
import '##/platform/container';
import { createConnection } from 'typeorm';

import type { JobRecipe } from '##/platform/queues/types/telegram';

import cacheConfig from '##/config/cache';
import logger from '##/platform/logging/logger';
import SendApiNotificationService from '##/apps/telegram/notifications/SendApiNotificationService';
import SendAdvancedMatchNotificationService from '##/apps/telegram/notifications/SendAdvancedMatchNotificationService';
import SendAutoTrackTopicNotificationService from '##/apps/telegram/notifications/SendAutoTrackTopicNotificationService';
import SendMentionNotificationService from '##/apps/telegram/notifications/SendMentionNotificationService';
import SendMeritNotificationService from '##/apps/telegram/notifications/SendMeritNotificationService';
import SendRemovedTopicNotificationService from '##/apps/telegram/notifications/SendRemovedTopicNotificationService';
import SendSigBanNotificationService from '##/apps/telegram/notifications/SendSigBanNotificationService';
import SendTrackedBoardNotificationService from '##/apps/telegram/notifications/SendTrackedBoardNotificationService';
import SendTrackedPhraseNotificationService from '##/apps/telegram/notifications/SendTrackedPhraseNotificationService';
import SendTrackedTopicNotificationService from '##/apps/telegram/notifications/SendTrackedTopicNotificationService';
import SendTrackedUserNotificationService from '##/apps/telegram/notifications/SendTrackedUserNotificationService';
import telegramQueue from '##/platform/queues/telegramQueue';

async function main() {
  await createConnection();

  container.registerSingleton('TelegramBot', TelegramBot);
  const bot = container.resolve<TelegramBot>('TelegramBot');
  const sendMentionNotification = container.resolve(SendMentionNotificationService);
  const sendMeritNotification = container.resolve(SendMeritNotificationService);
  const sendTrackedTopicNotification = container.resolve(SendTrackedTopicNotificationService);
  const sendRemovedTopicNotification = container.resolve(SendRemovedTopicNotificationService);
  const sendTrackedPhraseNotification = container.resolve(SendTrackedPhraseNotificationService);
  const sendTrackedBoardNotification = container.resolve(SendTrackedBoardNotificationService);
  const sendTrackedUserNotification = container.resolve(SendTrackedUserNotificationService);
  const sendAdvancedMatchNotification = container.resolve(SendAdvancedMatchNotificationService);
  const sendApiNotification = container.resolve(SendApiNotificationService);
  const sendAutoTrackTopicNotification = container.resolve(SendAutoTrackTopicNotificationService);
  const sendSigBanNotification = container.resolve(SendSigBanNotificationService);

  const jobRecipes: JobRecipe = {
    sendMentionNotification: async (job) => {
      const { user, post, history, mentionType } = job.data;
      await sendMentionNotification.execute({ bot, user, post, history, mentionType });
    },
    sendMeritNotification: async (job) => {
      const { merit, user, scrapedPostTitle = null } = job.data;
      await sendMeritNotification.execute({
        bot,
        telegramId: user.telegram_id,
        merit,
        scrapedPostTitle,
      });
    },
    sendTopicTrackingNotification: async (job) => {
      const { post, user } = job.data;
      await sendTrackedTopicNotification.execute({ bot, telegramId: user.telegram_id, post });
    },
    sendRemovedTopicNotification: async (job) => {
      const { postsDeleted, user, modLog } = job.data;
      await sendRemovedTopicNotification.execute({
        bot,
        telegramId: user.telegram_id,
        posts: postsDeleted,
        modLog,
      });
    },
    sendPhraseTrackingNotification: async (job) => {
      const { post, user, trackedPhrase } = job.data;
      await sendTrackedPhraseNotification.execute({
        bot,
        telegramId: user.telegram_id,
        post,
        phrase: trackedPhrase.phrase,
      });
    },
    sendTrackedBoardNotification: async (job) => {
      const { post, user, trackedBoard } = job.data;
      await sendTrackedBoardNotification.execute({
        bot,
        telegramId: user.telegram_id,
        post,
        trackedBoard,
      });
    },
    sendTrackedUserNotification: async (job) => {
      const { post, user } = job.data;
      await sendTrackedUserNotification.execute({ bot, telegramId: user.telegram_id, post });
    },
    sendAdvancedMatchNotification: async (job) => {
      const { post, user, advancedMatch } = job.data;
      await sendAdvancedMatchNotification.execute({
        bot,
        telegramId: user.telegram_id,
        post,
        advancedMatch,
      });
    },
    sendApiNotification: async (job) => {
      const { telegram_id, message } = job.data;
      await sendApiNotification.execute({ bot, telegramId: telegram_id, message });
    },
    sendAutoTrackTopicRequestNotification: async (job) => {
      const { topic, user } = job.data;
      await sendAutoTrackTopicNotification.execute({
        bot,
        telegramId: user.telegram_id,
        topic,
      });
    },
    sendSigBanNotification: async (job) => {
      const { user, modLog } = job.data;
      await sendSigBanNotification.execute({
        bot,
        telegramId: user.telegram_id,
        modLog,
      });
    },
  };

  const worker = new Worker(
    telegramQueue.name,
    async (job: Job) => {
      const jobRecipe = jobRecipes[job.name as keyof JobRecipe];

      if (!jobRecipe) {
        throw new Error(`No job recipe for ${job.name}`);
      }

      await (jobRecipe as (job: Job) => Promise<void>)(job);
    },
    {
      connection: { ...cacheConfig.config.redis, connectionName: 'TelegramQueue' },
      limiter: { max: 10, duration: 1000 },
    },
  );

  worker.on('active', async (job: Job) => {
    logger.debug(
      { jobName: job.name, jobId: job.id, data: job.data },
      `[${worker.name}][Worker][${job.id}] Active ${job.name}`,
    );
  });

  worker.on('completed', async (job: Job) => {
    logger.debug(
      { jobName: job.name, jobId: job.id, value: job.returnvalue, data: job.data },
      `[${worker.name}][Worker][${job.id}] Completed ${job.name}`,
    );
  });

  worker.on('failed', async (job, error) => {
    logger.warn(
      { jobName: job?.name, jobId: job?.id, error },
      `[${worker.name}][Worker][${job?.id ?? 'unknown'}] Failed for ${job?.failedReason ?? error.message}`,
    );
  });

  worker.on('error', async (error) => {
    logger.error(error, `[${worker.name}][Worker] Error`);
  });

  process.on('SIGINT', async () => {
    if (process.env.NODE_ENV === 'production' && bot.runner.isRunning()) {
      await bot.runner.stop();
    }

    process.exit(0);
  });
}

void main();
