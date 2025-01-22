import { container } from 'tsyringe';
import Post from '../../../../infra/typeorm/entities/Post';
import IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import TrackedTopic from '../../../../infra/typeorm/entities/TrackedTopic';
import UsersRepository from '../../../../../users/infra/typeorm/repositories/UsersRepository';
import FindTrackedTopicUsersService from '../../../../../../shared/infra/telegram/services/FindTrackedTopicUsersService';
import { RecipeData } from '../../../../../../shared/infra/bull/types/telegram';

type TelegramTrackedTopicsCheckerNotificationData = {
  userId: string;
  type: 'tracked_topic';
  metadata: RecipeData['sendTopicTrackingNotification'];
};

type TelegramTrackedTopicsCheckerParams = {
  post: Post;
  trackedTopics: TrackedTopic[];
  ignoredUsers: IgnoredUser[];
};

export const telegramTrackedTopicsChecker = async ({
  post,
  trackedTopics,
  ignoredUsers
}: TelegramTrackedTopicsCheckerParams): Promise<TelegramTrackedTopicsCheckerNotificationData[]> => {
  const data: TelegramTrackedTopicsCheckerNotificationData[] = [];

  const trackedTopic = trackedTopics.find(topic => topic.topic_id === post.topic_id);

  if (!trackedTopic) {
    return data;
  }

  for await (const trackingTelegramId of trackedTopic.tracking) {
    const usersRepository = container.resolve(UsersRepository);
    const findTrackedTopicUsers = container.resolve(FindTrackedTopicUsersService);

    const user = await usersRepository.findByTelegramId(trackingTelegramId);

    const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
    const isSameUid = user.user_id && post.author_uid === user.user_id;
    const isAlreadyNotified = post.notified_to.includes(user.telegram_id);
    const isAuthorIgnored = ignoredUsers
      .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
      ?.ignoring.includes(user.telegram_id);

    if (isSameUsername || isSameUid || isAlreadyNotified || isAuthorIgnored) {
      continue;
    }

    const trackedTopicUsers = await findTrackedTopicUsers.execute({
      telegram_id: user.telegram_id,
      topic_id: post.topic_id
    });

    const isAuthorWhitelisted = trackedTopicUsers.find(
      trackedTopicUser => trackedTopicUser.username.toLowerCase() === post.author.toLowerCase()
    );

    if (trackedTopicUsers.length && !isAuthorWhitelisted) {
      continue;
    }

    data.push({
      userId: user.id,
      type: 'tracked_topic',
      metadata: { post, user }
    });
  }

  return data;
};
