import Queue from 'bull';

import cacheConfig from '../../../../config/cache';
import logger from '../../../services/logger';

import SendMentionNotificationService from '../../telegram/services/SendMentionNotificationService';
import SendMeritNotificationService from '../../telegram/services/SendMeritNotificationService';

class TelegramNotificationsQueue {
  public queue: Queue.Queue;

  constructor() {
    this.init();
  }

  init(): void {
    this.queue = new Queue('telegramNotifications', {
      redis: cacheConfig.config.redis,
    });
  }

  public run(): void {
    const sendMentionNotification = new SendMentionNotificationService();
    const sendMeritNotification = new SendMeritNotificationService();

    this.queue.process('sendMentionNotification', async job => {
      const { post, user } = job.data;

      await sendMentionNotification.execute(user.telegram_id, post);
    });

    this.queue.process('sendMeritNotification', async job => {
      const { merit, user } = job.data;

      await sendMeritNotification.execute(user.telegram_id, merit);
    });

    this.queue.on('active', job => {
      logger.info({ data: job.data }, 'Starting job %s', job.name);
    });

    this.queue.on('error', err => {
      logger.error(err.message);
    });

    this.queue.on('failed', err => {
      logger.error(err.failedReason);
    });
  }
}

export default new TelegramNotificationsQueue();
