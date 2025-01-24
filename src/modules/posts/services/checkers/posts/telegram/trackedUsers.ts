import Post from '../../../../infra/typeorm/entities/Post';
import User from '../../../../../users/infra/typeorm/entities/User';
import TrackedUser from '../../../../infra/typeorm/entities/TrackedUser';
import { RecipeData } from '../../../../../../shared/infra/bull/types/telegram';
import logger from '../../../../../../shared/services/logger'; // Importe o logger corretamente

type TelegramTrackedUsersCheckerNotificationData = {
  userId: string;
  type: 'tracked_user';
  metadata: RecipeData['sendTrackedUserNotification'];
};

type TelegramTrackedUsersCheckerParams = {
  posts: Post[];
  trackedUsers: TrackedUser[];
};

const shouldNotifyUser = (post: Post, user: User): boolean => {
  const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
  const isSameUid = user.user_id && post.author_uid === user.user_id;
  const isAlreadyNotified = post.notified_to.includes(user.telegram_id);

  return !(isSameUsername || isSameUid || isAlreadyNotified);
};

const processPost = (post: Post, trackedUsers: TrackedUser[]): TelegramTrackedUsersCheckerNotificationData[] => {
  const data: TelegramTrackedUsersCheckerNotificationData[] = [];

  const trackedUsersWithMatchingPosts = trackedUsers.filter(
    trackedUser => !trackedUser.only_topics && trackedUser.username.toLowerCase() === post.author.toLowerCase()
  );

  for (const trackedUser of trackedUsersWithMatchingPosts) {
    try {
      const { user } = trackedUser;

      if (shouldNotifyUser(post, user)) {
        data.push({
          userId: user.id,
          type: 'tracked_user',
          metadata: { post, user }
        });
      }
    } catch (error) {
      logger.error(
        { error, post_id: post.post_id, telegram_id: trackedUser.user.telegram_id },
        `Error processing user ${trackedUser.user.telegram_id} for post ${post.post_id}`
      );
    }
  }

  return data;
};

// Função principal
export const telegramTrackedUsersChecker = async ({
  posts,
  trackedUsers
}: TelegramTrackedUsersCheckerParams): Promise<TelegramTrackedUsersCheckerNotificationData[]> => {
  const data: TelegramTrackedUsersCheckerNotificationData[] = [];

  for (const post of posts) {
    try {
      const notifications = processPost(post, trackedUsers);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, post_id: post.post_id }, `Error processing post ${post.post_id}`);
    }
  }

  return data;
};
