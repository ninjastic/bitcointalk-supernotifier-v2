import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import Topic from '../../../../infra/typeorm/entities/Topic';
import User from '../../../../../users/infra/typeorm/entities/User';
import { NotificationResult, RecipeMetadata } from '../../../../../../shared/infra/bull/types/telegram';
import logger from '../../../../../../shared/services/logger';

type TelegramAutoTrackTopicsCheckerNotificationResult = NotificationResult<
  RecipeMetadata['sendAutoTrackTopicRequestNotification']
>;

type TelegramAutoTrackTopicsCheckerParams = {
  topics: Topic[];
  users: User[];
};

const getUsersWithAutoTrackAndMatchingTopic = (topic: Topic, users: User[]): User[] =>
  users.filter(user => user.enable_auto_track_topics && topic.post.author_uid === user.user_id);

const shouldNotifyUser = (user: User): boolean => {
  const isUserBlocked = user.blocked;
  return !isUserBlocked;
};

const isUserAlreadyNotified = (topic: Topic, user: User): boolean => topic.post.notified_to.includes(user.telegram_id);

const processTopic = (topic: Topic, users: User[]): TelegramAutoTrackTopicsCheckerNotificationResult[] => {
  const data: TelegramAutoTrackTopicsCheckerNotificationResult[] = [];
  const matchingUsers = getUsersWithAutoTrackAndMatchingTopic(topic, users);

  for (const user of matchingUsers) {
    try {
      if (isUserAlreadyNotified(topic, user)) continue;
      if (!shouldNotifyUser(user)) continue;

      data.push({
        userId: user.id,
        type: NotificationType.AUTO_TRACK_TOPIC_REQUEST,
        metadata: { topic, user }
      });
    } catch (error) {
      logger.error(
        { error, telegramId: user.telegram_id, topicId: topic.topic_id },
        `Error processing user ${user.telegram_id} for topic ${topic.topic_id}`
      );
    }
  }

  return data;
};

export const telegramAutoTrackTopicsChecker = async ({
  topics,
  users
}: TelegramAutoTrackTopicsCheckerParams): Promise<TelegramAutoTrackTopicsCheckerNotificationResult[]> => {
  const data: TelegramAutoTrackTopicsCheckerNotificationResult[] = [];

  for (const topic of topics) {
    try {
      const notifications = processTopic(topic, users);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, topicId: topic.topic_id }, `Error processing topic ${topic.id}`);
    }
  }

  return data;
};
