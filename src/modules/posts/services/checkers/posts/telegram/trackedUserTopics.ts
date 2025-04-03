import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { shouldNotifyUser } from '##/shared/services/utils';
import Topic from '../../../../infra/typeorm/entities/Topic';
import TrackedUser from '../../../../infra/typeorm/entities/TrackedUser';
import { NotificationResult, RecipeMetadata } from '../../../../../../shared/infra/bull/types/telegram';
import logger from '../../../../../../shared/services/logger';

type TelegramTrackedUserTopicsCheckerNotificationResult = NotificationResult<
  RecipeMetadata['sendTrackedUserNotification']
>;

type TelegramTrackedUserTopicsCheckerParams = {
  topics: Topic[];
  trackedUsers: TrackedUser[];
};

const processTopic = (
  topic: Topic,
  trackedUsers: TrackedUser[]
): TelegramTrackedUserTopicsCheckerNotificationResult[] => {
  const data: TelegramTrackedUserTopicsCheckerNotificationResult[] = [];

  const trackedUsersWithMatchingTopics = trackedUsers.filter(
    trackedUser => trackedUser.only_topics && trackedUser.username.toLowerCase() === topic.post.author.toLowerCase()
  );

  for (const trackedUser of trackedUsersWithMatchingTopics) {
    try {
      const { user } = trackedUser;
      const { post } = topic;

      if (!shouldNotifyUser(post, user, [], [])) continue;

      data.push({
        userId: user.id,
        type: NotificationType.TRACKED_USER,
        metadata: { post, user }
      });
    } catch (error) {
      logger.error(
        { error, topicId: topic.topic_id, telegramId: trackedUser.user.telegram_id },
        `Error processing user ${trackedUser.user.telegram_id} for topic ${topic.topic_id}`
      );
    }
  }

  return data;
};

export const telegramTrackedUserTopicsChecker = async ({
  topics,
  trackedUsers
}: TelegramTrackedUserTopicsCheckerParams): Promise<TelegramTrackedUserTopicsCheckerNotificationResult[]> => {
  const data: TelegramTrackedUserTopicsCheckerNotificationResult[] = [];

  for (const topic of topics) {
    try {
      const notifications = processTopic(topic, trackedUsers);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, topicId: topic.topic_id }, `Error processing topic ${topic.topic_id}`);
    }
  }

  return data;
};
