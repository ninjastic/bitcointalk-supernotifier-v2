import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import Topic from '../../../../infra/typeorm/entities/Topic';
import User from '../../../../../users/infra/typeorm/entities/User';
import { RecipeData } from '../../../../../../shared/infra/bull/types/telegram';
import logger from '../../../../../../shared/services/logger';

type TelegramAutoTrackTopicsCheckerNotificationData = {
  userId: string;
  type: NotificationType.AUTO_TRACK_TOPIC_REQUEST;
  metadata: RecipeData['sendAutoTrackTopicRequestNotification'];
};

type TelegramAutoTrackTopicsCheckerParams = {
  topics: Topic[];
  users: User[];
};

const getUsersWithAutoTrackAndMatchingTopic = (topic: Topic, users: User[]): User[] =>
  users.filter(user => user.enable_auto_track_topics && topic.post.author_uid === user.user_id);

const isUserAlreadyNotified = (topic: Topic, user: User): boolean => topic.post.notified_to.includes(user.telegram_id);

const processTopic = (topic: Topic, users: User[]): TelegramAutoTrackTopicsCheckerNotificationData[] => {
  const data: TelegramAutoTrackTopicsCheckerNotificationData[] = [];
  const matchingUsers = getUsersWithAutoTrackAndMatchingTopic(topic, users);

  for (const user of matchingUsers) {
    try {
      if (isUserAlreadyNotified(topic, user)) {
        continue;
      }

      data.push({
        userId: user.id,
        type: NotificationType.AUTO_TRACK_TOPIC_REQUEST,
        metadata: { topic, user }
      });
    } catch (error) {
      logger.error(
        { error, telegram_id: user.telegram_id, topic_id: topic.topic_id },
        `Error processing user ${user.telegram_id} for topic ${topic.topic_id}`
      );
    }
  }

  return data;
};

export const telegramAutoTrackTopicsChecker = async ({
  topics,
  users
}: TelegramAutoTrackTopicsCheckerParams): Promise<TelegramAutoTrackTopicsCheckerNotificationData[]> => {
  const data: TelegramAutoTrackTopicsCheckerNotificationData[] = [];

  for (const topic of topics) {
    try {
      const notifications = processTopic(topic, users);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, topic_id: topic.topic_id }, `Error processing topic ${topic.id}`);
    }
  }

  return data;
};
