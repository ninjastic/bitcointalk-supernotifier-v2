import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import Post from '../../../../infra/typeorm/entities/Post';
import User from '../../../../../users/infra/typeorm/entities/User';
import TrackedUser from '../../../../infra/typeorm/entities/TrackedUser';
import { NotificationResult, RecipeMetadata } from '../../../../../../shared/infra/bull/types/telegram';
import logger from '../../../../../../shared/services/logger';

type TelegramTrackedUsersCheckerNotificationResult = NotificationResult<RecipeMetadata['sendTrackedUserNotification']>;

type TelegramTrackedUsersCheckerParams = {
  posts: Post[];
  trackedUsers: TrackedUser[];
};

const shouldNotifyUser = (post: Post, user: User): boolean => {
  const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
  const isSameUid = user.user_id && post.author_uid === user.user_id;
  const isAlreadyNotified = post.notified_to.includes(user.telegram_id);
  const isUserBlocked = user.blocked;

  return !(isSameUsername || isSameUid || isAlreadyNotified || isUserBlocked);
};

const processPost = (post: Post, trackedUsers: TrackedUser[]): TelegramTrackedUsersCheckerNotificationResult[] => {
  const data: TelegramTrackedUsersCheckerNotificationResult[] = [];

  const trackedUsersWithMatchingPosts = trackedUsers.filter(
    trackedUser => !trackedUser.only_topics && trackedUser.username.toLowerCase() === post.author.toLowerCase()
  );

  for (const trackedUser of trackedUsersWithMatchingPosts) {
    try {
      const { user } = trackedUser;

      if (!shouldNotifyUser(post, user)) continue;

      data.push({
        userId: user.id,
        type: NotificationType.TRACKED_USER,
        metadata: { post, user }
      });
    } catch (error) {
      logger.error(
        { error, postId: post.post_id, telegramId: trackedUser.user.telegram_id },
        `Error processing user ${trackedUser.user.telegram_id} for post ${post.post_id}`
      );
    }
  }

  return data;
};

export const telegramTrackedUsersChecker = async ({
  posts,
  trackedUsers
}: TelegramTrackedUsersCheckerParams): Promise<TelegramTrackedUsersCheckerNotificationResult[]> => {
  const data: TelegramTrackedUsersCheckerNotificationResult[] = [];

  for (const post of posts) {
    try {
      const notifications = processPost(post, trackedUsers);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, postId: post.post_id }, `Error processing post ${post.post_id}`);
    }
  }

  return data;
};
