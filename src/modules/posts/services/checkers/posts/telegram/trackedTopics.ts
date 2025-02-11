import { container } from 'tsyringe';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { shouldNotifyUser } from '##/shared/services/utils';
import Post from '../../../../infra/typeorm/entities/Post';
import IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import TrackedTopic from '../../../../infra/typeorm/entities/TrackedTopic';
import UsersRepository from '../../../../../users/infra/typeorm/repositories/UsersRepository';
import FindTrackedTopicUsersService from '../../../../../../shared/infra/telegram/services/FindTrackedTopicUsersService';
import { NotificationResult, RecipeMetadata } from '../../../../../../shared/infra/bull/types/telegram';
import logger from '../../../../../../shared/services/logger';

type TelegramTrackedTopicsCheckerNotificationResult = NotificationResult<
  RecipeMetadata['sendTopicTrackingNotification']
>;

type TelegramTrackedTopicsCheckerParams = {
  posts: Post[];
  trackedTopics: TrackedTopic[];
  ignoredUsers: IgnoredUser[];
};

const processPost = async (
  post: Post,
  trackedTopics: TrackedTopic[],
  ignoredUsers: IgnoredUser[]
): Promise<TelegramTrackedTopicsCheckerNotificationResult[]> => {
  const data: TelegramTrackedTopicsCheckerNotificationResult[] = [];
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

      if (!shouldNotifyUser(post, user, ignoredUsers, [])) continue;

      const trackedTopicUsers = await findTrackedTopicUsers.execute({
        telegram_id: user.telegram_id,
        topic_id: post.topic_id
      });

      const isAuthorWhitelisted = trackedTopicUsers.find(
        trackedTopicUser => trackedTopicUser.username.toLowerCase() === post.author.toLowerCase()
      );

      if (trackedTopicUsers.length && !isAuthorWhitelisted) continue;

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

export const telegramTrackedTopicsChecker = async ({
  posts,
  trackedTopics,
  ignoredUsers
}: TelegramTrackedTopicsCheckerParams): Promise<TelegramTrackedTopicsCheckerNotificationResult[]> => {
  const data: TelegramTrackedTopicsCheckerNotificationResult[] = [];

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
