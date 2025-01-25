import { container } from 'tsyringe';

import { NotificationType } from '@/modules/notifications/infra/typeorm/entities/Notification';
import Post from '../../../../infra/typeorm/entities/Post';
import User from '../../../../../users/infra/typeorm/entities/User';
import Topic from '../../../../infra/typeorm/entities/Topic';
import TrackedBoard from '../../../../infra/typeorm/entities/TrackedBoard';
import IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import { RecipeData } from '../../../../../../shared/infra/bull/types/telegram';
import PostsRepository from '../../../../infra/typeorm/repositories/PostsRepository';
import ICacheProvider from '../../../../../../shared/container/providers/models/ICacheProvider';
import logger from '../../../../../../shared/services/logger';

type TelegramTrackedBoardTopicsCheckerNotificationData = {
  userId: string;
  type: NotificationType.TRACKED_BOARD;
  metadata: RecipeData['sendTrackedBoardNotification'];
};

type TelegramTrackedBoardTopicsCheckerParams = {
  topics: Topic[];
  trackedBoards: TrackedBoard[];
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

const checkMinAuthorPostCount = async (user: User, authorUid: number, minAuthorPostCount: number): Promise<boolean> => {
  if (minAuthorPostCount <= 0) return true;

  const postsRepository = container.resolve(PostsRepository);
  const authorPostCount = (await postsRepository.findPosts({ author_uid: authorUid, limit: 500 })).length;

  return authorPostCount >= minAuthorPostCount;
};

const processTopic = async (
  topic: Topic,
  trackedBoards: TrackedBoard[],
  ignoredUsers: IgnoredUser[]
): Promise<TelegramTrackedBoardTopicsCheckerNotificationData[]> => {
  const data: TelegramTrackedBoardTopicsCheckerNotificationData[] = [];

  const trackedBoardsWithMatchingTopics = trackedBoards.filter(
    trackedBoard => trackedBoard.board_id === topic.post.board_id
  );

  for await (const trackedBoard of trackedBoardsWithMatchingTopics) {
    try {
      const { user } = trackedBoard;
      const { post } = topic;

      if (!shouldNotifyUser(post, user, ignoredUsers)) {
        continue;
      }

      const cacheRepository = container.resolve<ICacheProvider>('CacheRepository');
      const minAuthorPostCount =
        (await cacheRepository.recover<number>(`${user.telegram_id}:minTrackedBoardAuthorPostCount`)) ?? 0;

      if (!(await checkMinAuthorPostCount(user, post.author_uid, minAuthorPostCount))) {
        continue;
      }

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

// Função principal
export const telegramTrackedBoardTopicsChecker = async ({
  topics,
  trackedBoards,
  ignoredUsers
}: TelegramTrackedBoardTopicsCheckerParams): Promise<TelegramTrackedBoardTopicsCheckerNotificationData[]> => {
  const data: TelegramTrackedBoardTopicsCheckerNotificationData[] = [];

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
