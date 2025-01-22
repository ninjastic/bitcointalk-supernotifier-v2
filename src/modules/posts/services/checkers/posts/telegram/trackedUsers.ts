import Post from '../../../../infra/typeorm/entities/Post';
import TrackedUser from '../../../../infra/typeorm/entities/TrackedUser';
import { RecipeData } from '../../../../../../shared/infra/bull/types/telegram';

type TelegramTrackedUsersCheckerNotificationData = {
  userId: string;
  type: 'tracked_user';
  metadata: RecipeData['sendTrackedUserNotification'];
};

type TelegramTrackedUsersCheckerParams = {
  post: Post;
  trackedUsers: TrackedUser[];
};

export const telegramTrackedUsersChecker = async ({
  post,
  trackedUsers
}: TelegramTrackedUsersCheckerParams): Promise<TelegramTrackedUsersCheckerNotificationData[]> => {
  const data: TelegramTrackedUsersCheckerNotificationData[] = [];

  const trackedUsersWithMatchingPosts = trackedUsers.filter(
    trackedUser => !trackedUser.only_topics && trackedUser.username.toLowerCase() === post.author.toLowerCase()
  );

  for await (const trackedUser of trackedUsersWithMatchingPosts) {
    const { user } = trackedUser;

    const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
    const isSameUid = user.user_id && post.author_uid === user.user_id;
    const isAlreadyNotified = post.notified_to.includes(user.telegram_id);

    if (isSameUsername || isSameUid || isAlreadyNotified) {
      continue;
    }

    data.push({
      userId: user.id,
      type: 'tracked_user',
      metadata: { post, user }
    });
  }

  return data;
};
