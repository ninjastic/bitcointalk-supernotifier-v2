import Topic from '../../../../infra/typeorm/entities/Topic';
import TrackedUser from '../../../../infra/typeorm/entities/TrackedUser';
import { RecipeData } from '../../../../../../shared/infra/bull/types/telegram';

type TelegramTrackedUserTopicsCheckerNotificationData = {
  userId: string;
  type: 'tracked_user';
  metadata: RecipeData['sendTrackedUserNotification'];
};

export const telegramTrackedUserTopicsChecker = async (
  topic: Topic,
  trackedUsers: TrackedUser[]
): Promise<TelegramTrackedUserTopicsCheckerNotificationData[]> => {
  const data: TelegramTrackedUserTopicsCheckerNotificationData[] = [];

  const trackedUsersWithMatchingTopics = trackedUsers.filter(
    trackedUser => trackedUser.only_topics && trackedUser.username.toLowerCase() === topic.post.author.toLowerCase()
  );

  for await (const trackedUser of trackedUsersWithMatchingTopics) {
    const { user } = trackedUser;
    const { post } = topic;

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
