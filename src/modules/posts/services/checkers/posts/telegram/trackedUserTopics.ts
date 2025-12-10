import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { shouldNotifyUser } from '##/shared/services/utils';

import type { NotificationResult, RecipeMetadata } from '../../../../../../shared/infra/bull/types/telegram';
import type Topic from '../../../../infra/typeorm/entities/Topic';
import type TrackedUser from '../../../../infra/typeorm/entities/TrackedUser';

import logger from '../../../../../../shared/services/logger';

type TelegramTrackedUserTopicsCheckerNotificationResult = NotificationResult<
  RecipeMetadata['sendTrackedUserNotification']
>;

interface TelegramTrackedUserTopicsCheckerParams {
  topics: Topic[];
  trackedUsers: TrackedUser[];
}

function processTopic(topic: Topic, trackedUsers: TrackedUser[]): TelegramTrackedUserTopicsCheckerNotificationResult[] {
  const data: TelegramTrackedUserTopicsCheckerNotificationResult[] = [];

  const trackedUsersWithMatchingTopics = trackedUsers.filter(
    trackedUser => trackedUser.only_topics && trackedUser.username.toLowerCase() === topic.post.author.toLowerCase(),
  );

  for (const trackedUser of trackedUsersWithMatchingTopics) {
    try {
      const { user } = trackedUser;
      const { post } = topic;

      if (!shouldNotifyUser(post, user, [], []))
        continue;

      data.push({
        userId: user.id,
        type: NotificationType.TRACKED_USER,
        metadata: { post, user },
      });
    }
    catch (error) {
      logger.error(
        { error, topicId: topic.topic_id, telegramId: trackedUser.user.telegram_id },
        `Error processing user ${trackedUser.user.telegram_id} for topic ${topic.topic_id}`,
      );
    }
  }

  return data;
}

export async function telegramTrackedUserTopicsChecker({
  topics,
  trackedUsers,
}: TelegramTrackedUserTopicsCheckerParams): Promise<TelegramTrackedUserTopicsCheckerNotificationResult[]> {
  const data: TelegramTrackedUserTopicsCheckerNotificationResult[] = [];

  for (const topic of topics) {
    try {
      const notifications = processTopic(topic, trackedUsers);
      data.push(...notifications);
    }
    catch (error) {
      logger.error({ error, topicId: topic.topic_id }, `Error processing topic ${topic.topic_id}`);
    }
  }

  return data;
}
