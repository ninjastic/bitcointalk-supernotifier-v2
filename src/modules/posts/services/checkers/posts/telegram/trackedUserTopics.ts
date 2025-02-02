import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import Post from '../../../../infra/typeorm/entities/Post';
import User from '../../../../../users/infra/typeorm/entities/User';
import Topic from '../../../../infra/typeorm/entities/Topic';
import TrackedUser from '../../../../infra/typeorm/entities/TrackedUser';
import { RecipeData } from '../../../../../../shared/infra/bull/types/telegram';
import logger from '../../../../../../shared/services/logger';

type TelegramTrackedUserTopicsCheckerNotificationData = {
  userId: string;
  type: NotificationType.TRACKED_USER;
  metadata: RecipeData['sendTrackedUserNotification'];
};

type TelegramTrackedUserTopicsCheckerParams = {
  topics: Topic[];
  trackedUsers: TrackedUser[];
};

const shouldNotifyUser = (post: Post, user: User): boolean => {
  const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
  const isSameUid = user.user_id && post.author_uid === user.user_id;
  const isAlreadyNotified = post.notified_to.includes(user.telegram_id);

  return !(isSameUsername || isSameUid || isAlreadyNotified);
};

const processTopic = (
  topic: Topic,
  trackedUsers: TrackedUser[]
): TelegramTrackedUserTopicsCheckerNotificationData[] => {
  const data: TelegramTrackedUserTopicsCheckerNotificationData[] = [];

  const trackedUsersWithMatchingTopics = trackedUsers.filter(
    trackedUser => trackedUser.only_topics && trackedUser.username.toLowerCase() === topic.post.author.toLowerCase()
  );

  for (const trackedUser of trackedUsersWithMatchingTopics) {
    try {
      const { user } = trackedUser;
      const { post } = topic;

      if (shouldNotifyUser(post, user)) {
        data.push({
          userId: user.id,
          type: NotificationType.TRACKED_USER,
          metadata: { post, user }
        });
      }
    } catch (error) {
      logger.error(
        { error, topic_id: topic.topic_id, telegram_id: trackedUser.user.telegram_id },
        `Error processing user ${trackedUser.user.telegram_id} for topic ${topic.topic_id}`
      );
    }
  }

  return data;
};

export const telegramTrackedUserTopicsChecker = async ({
  topics,
  trackedUsers
}: TelegramTrackedUserTopicsCheckerParams): Promise<TelegramTrackedUserTopicsCheckerNotificationData[]> => {
  const data: TelegramTrackedUserTopicsCheckerNotificationData[] = [];

  for (const topic of topics) {
    try {
      const notifications = processTopic(topic, trackedUsers);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, topic_id: topic.topic_id }, `Error processing topic ${topic.topic_id}`);
    }
  }

  return data;
};
