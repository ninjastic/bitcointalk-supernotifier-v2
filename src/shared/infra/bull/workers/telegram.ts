import { container } from 'tsyringe';

import telegramQueue from '../queues/telegramQueue';

import SendMentionNotificationService from '../../telegram/services/SendMentionNotificationService';
import SendMeritNotificationService from '../../telegram/services/SendMeritNotificationService';
import SendTrackedTopicNotificationService from '../../telegram/services/SendTrackedTopicNotificationService';
import SendTrackedPhraseNotificationService from '../../telegram/services/SendTrackedPhraseNotificationService';
import SendRemovedTopicNotificationService from '../../telegram/services/SendRemovedTopicNotificationService';
import SendTrackedBoardNotificationService from '../../telegram/services/SendTrackedBoardNotificationService';
import SendTrackedUserNotificationService from '../../telegram/services/SendTrackedUserNotificationService';
import SendApiNotificationService from '../../telegram/services/SendApiNotificationService';

telegramQueue.process('sendMentionNotification', async job => {
  const { post, user, history } = job.data;
  const sendMentionNotification = new SendMentionNotificationService();
  await sendMentionNotification.execute(user.telegram_id, post, history);
});

telegramQueue.process('sendMeritNotification', async job => {
  const { merit, user } = job.data;
  const sendMeritNotification = container.resolve(SendMeritNotificationService);
  await sendMeritNotification.execute(user.telegram_id, merit);
});

telegramQueue.process('sendTopicTrackingNotification', async job => {
  const { post, user } = job.data;
  const sendTrackedTopicNotification = new SendTrackedTopicNotificationService();
  await sendTrackedTopicNotification.execute(user.telegram_id, post);
});

telegramQueue.process('sendRemovedTopicNotification', async job => {
  const { postsDeleted, user, modLog } = job.data;
  const sendRemovedTopicNotification = new SendRemovedTopicNotificationService();
  await sendRemovedTopicNotification.execute(user.telegram_id, postsDeleted, modLog);
});

telegramQueue.process('sendPhraseTrackingNotification', async job => {
  const { post, user, trackedPhrase } = job.data;
  const sendTrackedPhraseNotification = new SendTrackedPhraseNotificationService();
  await sendTrackedPhraseNotification.execute(user.telegram_id, post, trackedPhrase?.phrase);
});

telegramQueue.process('sendTrackedBoardNotification', async job => {
  const { post, user, trackedBoard } = job.data;
  const sendTrackedBoardNotification = new SendTrackedBoardNotificationService();
  await sendTrackedBoardNotification.execute(user.telegram_id, post, trackedBoard);
});

telegramQueue.process('sendTrackedUserNotification', async job => {
  const { post, user } = job.data;
  const sendTrackedBoardNotification = new SendTrackedUserNotificationService();
  await sendTrackedBoardNotification.execute(user.telegram_id, post);
});

telegramQueue.process('sendApiNotification', async job => {
  const { telegram_id, message } = job.data;
  const sendApiNotification = new SendApiNotificationService();
  await sendApiNotification.execute(telegram_id, message);
});
