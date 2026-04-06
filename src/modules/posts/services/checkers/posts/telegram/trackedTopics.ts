import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { shouldNotifyUserWithIndex } from '##/shared/services/utils';

import type {
  NotificationResult,
  RecipeMetadata,
} from '../../../../../../shared/infra/bull/types/telegram';
import type Post from '../../../../infra/typeorm/entities/Post';
import type { PreparedTrackedTopicContext } from './prepared-checker-data';

import logger from '../../../../../../shared/services/logger';

type TelegramTrackedTopicsCheckerNotificationResult = NotificationResult<
  RecipeMetadata['sendTopicTrackingNotification']
>;

interface TelegramTrackedTopicsCheckerParams {
  posts: Post[];
  context: PreparedTrackedTopicContext;
}

async function processPost(
  post: Post,
  context: PreparedTrackedTopicContext,
): Promise<TelegramTrackedTopicsCheckerNotificationResult[]> {
  const data: TelegramTrackedTopicsCheckerNotificationResult[] = [];
  const trackedTopic = context.trackedTopicsByTopicId.get(post.topic_id);

  if (!trackedTopic) {
    return data;
  }

  for await (const trackingTelegramId of trackedTopic.tracking) {
    try {
      const user = context.usersByTelegramId.get(trackingTelegramId);

      if (!user) {
        logger.error(
          { post_id: post.post_id, trackedTopic_id: trackedTopic.topic_id, trackingTelegramId },
          `User not found for trackingTelegramId ${trackingTelegramId}`,
        );
        continue;
      }

      if (!shouldNotifyUserWithIndex(post, user, context.ignoredIndex)) continue;

      const trackedTopicUsers =
        context.trackedTopicUsersByKey.get(`${user.telegram_id}:${post.topic_id}`) ?? [];

      const isAuthorWhitelisted = trackedTopicUsers.find(
        (trackedTopicUser) => trackedTopicUser.username.toLowerCase() === post.author.toLowerCase(),
      );

      if (trackedTopicUsers.length && !isAuthorWhitelisted) continue;

      data.push({
        userId: user.id,
        type: NotificationType.TRACKED_TOPIC,
        metadata: { post, user },
      });
    } catch (error) {
      logger.error(
        { error, postId: post.post_id, trackingTelegramId },
        `Error processing user ${trackingTelegramId} for post ${post.post_id}`,
      );
    }
  }

  return data;
}

export async function telegramTrackedTopicsChecker({
  posts,
  context,
}: TelegramTrackedTopicsCheckerParams): Promise<TelegramTrackedTopicsCheckerNotificationResult[]> {
  const data: TelegramTrackedTopicsCheckerNotificationResult[] = [];

  for await (const post of posts) {
    try {
      const notifications = await processPost(post, context);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, postId: post.post_id }, `Error processing post ${post.post_id}`);
    }
  }

  return data;
}
