import { container } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../../config/cache';
import loggerHandler from '../handlers/loggerHandler';

import SendMentionNotificationService from '../../telegram/services/SendMentionNotificationService';
import SendMeritNotificationService from '../../telegram/services/SendMeritNotificationService';
import SendTrackedTopicNotificationService from '../../telegram/services/SendTrackedTopicNotificationService';
import SendTrackedPhraseNotificationService from '../../telegram/services/SendTrackedPhraseNotificationService';
import SendRemovedTopicNotificationService from '../../telegram/services/SendRemovedTopicNotificationService';
import SendTrackedBoardNotificationService from '../../telegram/services/SendTrackedBoardNotificationService';
import SendTrackedUserNotificationService from '../../telegram/services/SendTrackedUserNotificationService';
import SendApiNotificationService from '../../telegram/services/SendApiNotificationService';

class TelegramQueue {
  public instance: Queue.Queue;

  constructor() {
    this.instance = new Queue('TelegramQueue', {
      redis: cacheConfig.config.redis,
      limiter: {
        max: 1,
        duration: 200
      },
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: true,
        removeOnFail: true
      }
    });
  }

  public run(): void {
    this.instance.process('sendMentionNotification', async job => {
      const { post, user, history } = job.data;
      const sendMentionNotification = new SendMentionNotificationService();
      await sendMentionNotification.execute(user.telegram_id, post, history);
    });

    this.instance.process('sendMeritNotification', async job => {
      const { merit, user } = job.data;
      const sendMeritNotification = container.resolve(SendMeritNotificationService);
      await sendMeritNotification.execute(user.telegram_id, merit);
    });

    this.instance.process('sendTopicTrackingNotification', async job => {
      const { post, user } = job.data;
      const sendTrackedTopicNotification = new SendTrackedTopicNotificationService();
      await sendTrackedTopicNotification.execute(user.telegram_id, post);
    });

    this.instance.process('sendRemovedTopicNotification', async job => {
      const { postsDeleted, user, modLog } = job.data;
      const sendRemovedTopicNotification = new SendRemovedTopicNotificationService();
      await sendRemovedTopicNotification.execute(user.telegram_id, postsDeleted, modLog);
    });

    this.instance.process('sendPhraseTrackingNotification', async job => {
      const { post, user, trackedPhrase } = job.data;
      const sendTrackedPhraseNotification = new SendTrackedPhraseNotificationService();
      await sendTrackedPhraseNotification.execute(user.telegram_id, post, trackedPhrase?.phrase);
    });

    this.instance.process('sendTrackedBoardNotification', async job => {
      const { post, user, trackedBoard } = job.data;
      const sendTrackedBoardNotification = new SendTrackedBoardNotificationService();
      await sendTrackedBoardNotification.execute(user.telegram_id, post, trackedBoard);
    });

    this.instance.process('sendTrackedUserNotification', async job => {
      const { post, user } = job.data;
      const sendTrackedBoardNotification = new SendTrackedUserNotificationService();
      await sendTrackedBoardNotification.execute(user.telegram_id, post);
    });

    this.instance.process('sendApiNotification', async job => {
      const { telegram_id, message } = job.data;
      const sendApiNotification = new SendApiNotificationService();
      await sendApiNotification.execute(telegram_id, message);
    });

    loggerHandler(this.instance);
  }

  public async close(): Promise<void> {
    await this.instance.close();
  }
}

export default TelegramQueue;
