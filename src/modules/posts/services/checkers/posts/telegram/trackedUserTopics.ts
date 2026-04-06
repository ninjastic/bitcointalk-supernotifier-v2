import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { shouldNotifyUser } from '##/shared/services/utils';

import type {
  NotificationResult,
  RecipeMetadata,
} from '../../../../../../shared/infra/bull/types/telegram';
import type Topic from '../../../../infra/typeorm/entities/Topic';
import type { PreparedTrackedUserContext } from './prepared-checker-data';

import logger from '../../../../../../shared/services/logger';

type TelegramTrackedUserTopicsCheckerNotificationResult = NotificationResult<
  RecipeMetadata['sendTrackedUserNotification']
>;

interface TelegramTrackedUserTopicsCheckerParams {
  topics: Topic[];
  context: PreparedTrackedUserContext;
}

function processTopic(
  topic: Topic,
  context: PreparedTrackedUserContext,
): TelegramTrackedUserTopicsCheckerNotificationResult[] {
  const data: TelegramTrackedUserTopicsCheckerNotificationResult[] = [];

  const trackedUsersWithMatchingTopics =
    context.trackedUsersByUsername.get(topic.post.author.toLowerCase()) ?? [];

  for (const trackedUser of trackedUsersWithMatchingTopics) {
    try {
      const { user } = trackedUser;
      const { post } = topic;

      if (!trackedUser.only_topics) continue;

      if (!shouldNotifyUser(post, user, [], [])) continue;

      data.push({
        userId: user.id,
        type: NotificationType.TRACKED_USER,
        metadata: { post, user },
      });
    } catch (error) {
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
  context,
}: TelegramTrackedUserTopicsCheckerParams): Promise<
  TelegramTrackedUserTopicsCheckerNotificationResult[]
> {
  const data: TelegramTrackedUserTopicsCheckerNotificationResult[] = [];

  for (const topic of topics) {
    try {
      const notifications = processTopic(topic, context);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, topicId: topic.topic_id }, `Error processing topic ${topic.topic_id}`);
    }
  }

  return data;
}
