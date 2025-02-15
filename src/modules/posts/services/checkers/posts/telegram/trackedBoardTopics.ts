import { container } from 'tsyringe';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { shouldNotifyUser } from '##/shared/services/utils';
import Post from '##/modules/posts/infra/typeorm/entities/Post';
import User from '../../../../../users/infra/typeorm/entities/User';
import Topic from '../../../../infra/typeorm/entities/Topic';
import TrackedBoard from '../../../../infra/typeorm/entities/TrackedBoard';
import IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import { NotificationResult, RecipeMetadata } from '../../../../../../shared/infra/bull/types/telegram';
import PostsRepository from '../../../../infra/typeorm/repositories/PostsRepository';
import ICacheProvider from '../../../../../../shared/container/providers/models/ICacheProvider';
import logger from '../../../../../../shared/services/logger';

type TelegramTrackedBoardTopicsCheckerNotificationResult = NotificationResult<
  RecipeMetadata['sendTrackedBoardNotification']
>;

type TelegramTrackedBoardTopicsCheckerParams = {
  topics: Topic[];
  trackedBoards: TrackedBoard[];
  ignoredUsers: IgnoredUser[];
};

const checkMinAuthorPostCount = async (user: User, post: Post): Promise<boolean> => {
  const cacheRepository = container.resolve<ICacheProvider>('CacheRepository');
  let userMinAuthorPostCount = await cacheRepository.recover<number>(
    `${user.telegram_id}:minTrackedBoardAuthorPostCount`
  );

  if (!userMinAuthorPostCount) {
    userMinAuthorPostCount = 1; // default value
  }

  const postsRepository = container.resolve(PostsRepository);
  const authorPosts = await postsRepository.findPosts({ author_uid: post.author_uid, limit: 100 });

  if (authorPosts.length < 10) {
    const isEqualTopicTitle = authorPosts.find(authorPost => authorPost.title === post.title);
    if (isEqualTopicTitle) return false;
  }

  return authorPosts.length > userMinAuthorPostCount;
};

const processTopic = async (
  topic: Topic,
  trackedBoards: TrackedBoard[],
  ignoredUsers: IgnoredUser[]
): Promise<TelegramTrackedBoardTopicsCheckerNotificationResult[]> => {
  const data: TelegramTrackedBoardTopicsCheckerNotificationResult[] = [];

  const trackedBoardsWithMatchingTopics = trackedBoards.filter(
    trackedBoard => trackedBoard.board_id === topic.post.board_id
  );

  for await (const trackedBoard of trackedBoardsWithMatchingTopics) {
    try {
      const { user } = trackedBoard;
      const { post } = topic;

      if (!shouldNotifyUser(post, user, ignoredUsers, [])) continue;

      const isAuthorPostCountEnough = await checkMinAuthorPostCount(user, post);
      if (!isAuthorPostCountEnough) continue;

      data.push({
        userId: user.id,
        type: NotificationType.TRACKED_BOARD,
        metadata: { post, user, trackedBoard }
      });
    } catch (error) {
      logger.error(
        { error, topic_id: topic.topic_id, telegram_id: trackedBoard.user.telegram_id },
        `Error processing user ${trackedBoard.user.telegram_id} for topic ${topic.topic_id}`
      );
    }
  }

  return data;
};

export const telegramTrackedBoardTopicsChecker = async ({
  topics,
  trackedBoards,
  ignoredUsers
}: TelegramTrackedBoardTopicsCheckerParams): Promise<TelegramTrackedBoardTopicsCheckerNotificationResult[]> => {
  const data: TelegramTrackedBoardTopicsCheckerNotificationResult[] = [];

  for await (const topic of topics) {
    try {
      const notifications = await processTopic(topic, trackedBoards, ignoredUsers);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, topic_id: topic.topic_id }, `Error processing topic ${topic.topic_id}`);
    }
  }

  return data;
};
