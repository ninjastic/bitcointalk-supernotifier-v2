import { container } from 'tsyringe';

import { NotificationType } from '@/modules/notifications/infra/typeorm/entities/Notification';
import Post from '../../../../infra/typeorm/entities/Post';
import User from '../../../../../users/infra/typeorm/entities/User';
import IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import TrackedTopic from '../../../../infra/typeorm/entities/TrackedTopic';
import UsersRepository from '../../../../../users/infra/typeorm/repositories/UsersRepository';
import FindTrackedTopicUsersService from '../../../../../../shared/infra/telegram/services/FindTrackedTopicUsersService';
import { RecipeData } from '../../../../../../shared/infra/bull/types/telegram';
import logger from '../../../../../../shared/services/logger';

type TelegramTrackedTopicsCheckerNotificationData = {
  userId: string;
  type: NotificationType.TRACKED_TOPIC;
  metadata: RecipeData['sendTopicTrackingNotification'];
};

type TelegramTrackedTopicsCheckerParams = {
  posts: Post[];
  trackedTopics: TrackedTopic[];
  ignoredUsers: IgnoredUser[];
};

const shouldNotifyUser = (post: Post, user: User, ignoredUsers: IgnoredUser[]): boolean => {
  const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
  const isSameUid = user.user_id && post.author_uid === user.user_id;
  const isAlreadyNotified = post.notified_to.includes(user.telegram_id);
  const isAuthorIgnored = ignoredUsers
    .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
    ?.ignoring.includes(user.telegram_id);

  return !(isSameUsername || isSameUid || isAlreadyNotified || isAuthorIgnored);
};

const processPost = async (
  post: Post,
  trackedTopics: TrackedTopic[],
  ignoredUsers: IgnoredUser[]
): Promise<TelegramTrackedTopicsCheckerNotificationData[]> => {
  const data: TelegramTrackedTopicsCheckerNotificationData[] = [];
  const trackedTopic = trackedTopics.find(topic => topic.topic_id === post.topic_id);

  if (!trackedTopic) {
    return data;
  }

  for await (const trackingTelegramId of trackedTopic.tracking) {
    try {
      const usersRepository = container.resolve(UsersRepository);
      const findTrackedTopicUsers = container.resolve(FindTrackedTopicUsersService);

      const user = await usersRepository.findByTelegramId(trackingTelegramId);

      if (!user) {
        logger.error(
          { post_id: post.post_id, trackedTopic_id: trackedTopic.topic_id, trackingTelegramId },
          `User not found for trackingTelegramId ${trackingTelegramId}`
        );
        continue;
      }

      if (!shouldNotifyUser(post, user, ignoredUsers)) {
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
        type: NotificationType.TRACKED_TOPIC,
        metadata: { post, user }
      });
    } catch (error) {
      logger.error(
        { error, post_id: post.post_id, trackingTelegramId },
        `Error processing user ${trackingTelegramId} for post ${post.post_id}`
      );
    }
  }

  return data;
};

// Função principal
export const telegramTrackedTopicsChecker = async ({
  posts,
  trackedTopics,
  ignoredUsers
}: TelegramTrackedTopicsCheckerParams): Promise<TelegramTrackedTopicsCheckerNotificationData[]> => {
  const data: TelegramTrackedTopicsCheckerNotificationData[] = [];

  for await (const post of posts) {
    try {
      const notifications = await processPost(post, trackedTopics, ignoredUsers);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, post_id: post.post_id }, `Error processing post ${post.post_id}`);
    }
  }

  return data;
};
