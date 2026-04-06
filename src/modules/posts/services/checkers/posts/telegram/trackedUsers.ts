import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';

import type {
  NotificationResult,
  RecipeMetadata,
} from '../../../../../../shared/infra/bull/types/telegram';
import type User from '../../../../../users/infra/typeorm/entities/User';
import type Post from '../../../../infra/typeorm/entities/Post';
import type { PreparedTrackedUserContext } from './prepared-checker-data';

import logger from '../../../../../../shared/services/logger';

type TelegramTrackedUsersCheckerNotificationResult = NotificationResult<
  RecipeMetadata['sendTrackedUserNotification']
>;

interface TelegramTrackedUsersCheckerParams {
  posts: Post[];
  context: PreparedTrackedUserContext;
}

function shouldNotifyUser(post: Post, user: User): boolean {
  const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
  const isSameUid = user.user_id && post.author_uid === user.user_id;
  const isAlreadyNotified = post.notified_to.includes(user.telegram_id);
  const isUserBlocked = user.blocked;

  return !(isSameUsername || isSameUid || isAlreadyNotified || isUserBlocked);
}

function processPost(
  post: Post,
  context: PreparedTrackedUserContext,
): TelegramTrackedUsersCheckerNotificationResult[] {
  const data: TelegramTrackedUsersCheckerNotificationResult[] = [];

  const trackedUsersWithMatchingPosts =
    context.trackedUsersByUsername.get(post.author.toLowerCase()) ?? [];

  for (const trackedUser of trackedUsersWithMatchingPosts) {
    try {
      const { user } = trackedUser;

      if (trackedUser.only_topics) continue;

      if (!shouldNotifyUser(post, user)) continue;

      data.push({
        userId: user.id,
        type: NotificationType.TRACKED_USER,
        metadata: { post, user },
      });
    } catch (error) {
      logger.error(
        { error, postId: post.post_id, telegramId: trackedUser.user.telegram_id },
        `Error processing user ${trackedUser.user.telegram_id} for post ${post.post_id}`,
      );
    }
  }

  return data;
}

export async function telegramTrackedUsersChecker({
  posts,
  context,
}: TelegramTrackedUsersCheckerParams): Promise<TelegramTrackedUsersCheckerNotificationResult[]> {
  const data: TelegramTrackedUsersCheckerNotificationResult[] = [];

  for (const post of posts) {
    try {
      const notifications = processPost(post, context);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, postId: post.post_id }, `Error processing post ${post.post_id}`);
    }
  }

  return data;
}
