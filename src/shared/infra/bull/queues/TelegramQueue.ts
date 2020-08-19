import Queue from 'bull';

import cacheConfig from '../../../../config/cache';
import loggerHandler from '../handlers/loggerHandler';

import SendMentionNotificationService from '../../telegram/services/SendMentionNotificationService';
import SendMeritNotificationService from '../../telegram/services/SendMeritNotificationService';
import SendTopicTrackingNotificationService from '../../telegram/services/SendTopicTrackingNotificationService';

class TelegramQueue {
  public instance: Queue.Queue;

  constructor() {
    this.instance = new Queue('TelegramQueue', {
      redis: cacheConfig.config.redis,
    });
  }

  public run(): void {
    this.instance.process('sendMentionNotification', async job => {
      const sendMentionNotification = new SendMentionNotificationService();

      const { post, user } = job.data;
      await sendMentionNotification.execute(user.telegram_id, post);
    });

    this.instance.process('sendMeritNotification', async job => {
      const sendMeritNotification = new SendMeritNotificationService();

      const { merit, user } = job.data;
      await sendMeritNotification.execute(user.telegram_id, merit);
    });

    this.instance.process('sendTopicTrackingNotification', async job => {
      const sendTopicTrackingNotification = new SendTopicTrackingNotificationService();

      const { post, user } = job.data;
      await sendTopicTrackingNotification.execute(user.telegram_id, post);
    });

    loggerHandler(this.instance);
  }
}

export default TelegramQueue;
