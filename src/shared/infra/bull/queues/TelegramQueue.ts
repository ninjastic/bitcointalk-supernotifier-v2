import { container } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../../config/cache';
import loggerHandler from '../handlers/loggerHandler';

import SendMentionNotificationService from '../../telegram/services/SendMentionNotificationService';
import SendMeritNotificationService from '../../telegram/services/SendMeritNotificationService';
import SendTopicTrackingNotificationService from '../../telegram/services/SendTopicTrackingNotificationService';
import SendRemovedTopicNotificationService from '../../telegram/services/SendRemovedTopicNotificationService';

class TelegramQueue {
  public instance: Queue.Queue;

  constructor() {
    this.instance = new Queue('TelegramQueue', {
      redis: cacheConfig.config.redis,
      defaultJobOptions: {
        attempts: 2,
      },
    });
  }

  public run(): void {
    this.instance.process('sendMentionNotification', async job => {
      const sendMentionNotification = new SendMentionNotificationService();

      const { post, user, history } = job.data;
      await sendMentionNotification.execute(user.telegram_id, post, history);
    });

    this.instance.process('sendMeritNotification', async job => {
      const sendMeritNotification = container.resolve(
        SendMeritNotificationService,
      );

      const { merit, user } = job.data;
      await sendMeritNotification.execute(user.telegram_id, merit);
    });

    this.instance.process('sendTopicTrackingNotification', async job => {
      const sendTopicTrackingNotification = new SendTopicTrackingNotificationService();

      const { post, user } = job.data;
      await sendTopicTrackingNotification.execute(user.telegram_id, post);
    });

    this.instance.process('sendRemovedTopicNotification', async job => {
      const sendRemovedTopicNotification = new SendRemovedTopicNotificationService();

      const { postsDeleted, user, modLog } = job.data;
      await sendRemovedTopicNotification.execute(
        user.telegram_id,
        postsDeleted,
        modLog,
      );
    });

    loggerHandler(this.instance);
  }
}

export default TelegramQueue;
