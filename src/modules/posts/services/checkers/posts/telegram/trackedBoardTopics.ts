import { container } from 'tsyringe';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { shouldNotifyUser } from '##/shared/services/utils';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type User from '../../../../../users/infra/typeorm/entities/User';
import Topic from '../../../../infra/typeorm/entities/Topic';
import type TrackedBoard from '../../../../infra/typeorm/entities/TrackedBoard';
import type IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import type { NotificationResult, RecipeMetadata } from '../../../../../../shared/infra/bull/types/telegram';
import type PostsRepository from '../../../../infra/typeorm/repositories/PostsRepository';
import type ICacheProvider from '../../../../../../shared/container/providers/models/ICacheProvider';
import logger from '../../../../../../shared/services/logger';
import { subDays } from 'date-fns';
import { getRepository } from 'typeorm';

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

  const postsRepository = container.resolve<PostsRepository>('PostsRepository');
  const authorPosts = await postsRepository.findPosts({ author_uid: post.author_uid, limit: 100 });

  if (authorPosts.length < 10) {
    const isEqualTopicTitle = authorPosts.find(authorPost => authorPost.title === post.title);
    if (isEqualTopicTitle) return false;
  }

  return authorPosts.length > userMinAuthorPostCount;
};

const checkPotentialSpam = async (post: Post) => {
  const topicsRepository = getRepository(Topic);

  const matchingTopics = await topicsRepository
    .createQueryBuilder('topics')
    .innerJoinAndSelect('topics.post', 'post')
    .where('post.title = :title', { title: post.title })
    .andWhere('post.date >= :date', { date: subDays(new Date(), 1) })
    .getMany();

  if (matchingTopics.length > 1) return true;
  return false;
};

const checkIsTopicMoved = async (post: Post) => {
  if (!post.title.startsWith('MOVED: ')) return false;

  const originalTitle = post.title.replace(/^MOVED: /, '');

  const topicsRepository = getRepository(Topic);
  const matchingTopics = await topicsRepository
    .createQueryBuilder('topics')
    .innerJoinAndSelect('topics.post', 'post')
    .where('post.title = :title', { title: originalTitle })
    .andWhere('post.date >= :date', { date: subDays(new Date(), 7) })
    .getMany();

  if (matchingTopics.length > 0) return true;
  return false;
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

      const isPotentialSpam = await checkPotentialSpam(post);
      if (isPotentialSpam) continue;

      const isTopicMoved = await checkIsTopicMoved(post);
      if (isTopicMoved) continue;

      data.push({
        userId: user.id,
        type: NotificationType.TRACKED_BOARD,
        metadata: { post, user, trackedBoard }
      });
    } catch (error) {
      logger.error(
        { error, topicId: topic.topic_id, telegramId: trackedBoard.user.telegram_id },
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
      logger.error({ error, topicId: topic.topic_id }, `Error processing topic ${topic.topic_id}`);
    }
  }

  return data;
};
