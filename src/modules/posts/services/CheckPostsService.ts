import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type TrackedTopicUser from '##/modules/posts/infra/typeorm/entities/TrackedTopicUser';
import type { NotificationService } from '##/modules/posts/services/notification-service';
import type User from '##/modules/users/infra/typeorm/entities/User';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import PostVersion from '##/modules/posts/infra/typeorm/entities/PostVersion';
import GetIgnoredUsersService from '##/modules/users/services/GetIgnoredUsersService';
import { sub } from 'date-fns';
import { container, inject, injectable } from 'tsyringe';
import { getRepository, IsNull, MoreThanOrEqual, Not } from 'typeorm';

import type ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import type { NotificationResult, RecipeNames } from '../../../shared/infra/bull/types/telegram';
import type IUsersRepository from '../../users/repositories/IUsersRepository';
import type IPostsRepository from '../repositories/IPostsRepository';
import type {
  PreparedCheckerPost,
  PreparedTrackedBoardContext,
  PreparedTrackedPhrase,
  PreparedTrackedTopicContext,
  PreparedTrackedUserContext,
} from './checkers/posts/telegram/prepared-checker-data';

import { addTelegramJob } from '../../../shared/infra/bull/queues/telegramQueue';
import logger from '../../../shared/services/logger';
import {
  createMentionRegex,
  createNotificationIgnoreIndex,
  preparePostMentionContent,
} from '../../../shared/services/utils';
import IgnoredBoard from '../infra/typeorm/entities/IgnoredBoard';
import TopicRepository from '../infra/typeorm/repositories/TopicRepository';
import TrackedBoardsRepository from '../infra/typeorm/repositories/TrackedBoardsRepository';
import TrackedTopicUsersRepository from '../infra/typeorm/repositories/TrackedTopicUsersRepository';
import TrackedUsersRepository from '../infra/typeorm/repositories/TrackedUsersRepository';
import { telegramAutoTrackTopicsChecker } from './checkers/posts/telegram/autoTrackTopics';
import { telegramMentionsChecker } from './checkers/posts/telegram/mentions';
import { telegramTrackedBoardTopicsChecker } from './checkers/posts/telegram/trackedBoardTopics';
import { telegramTrackedPhrasesChecker } from './checkers/posts/telegram/trackedPhrases';
import { telegramTrackedTopicsChecker } from './checkers/posts/telegram/trackedTopics';
import { telegramTrackedUsersChecker } from './checkers/posts/telegram/trackedUsers';
import { telegramTrackedUserTopicsChecker } from './checkers/posts/telegram/trackedUserTopics';
import GetIgnoredTopicsService from './GetIgnoredTopicsService';
import GetTrackedPhrasesService from './GetTrackedPhrasesService';
import GetTrackedTopicsService from './GetTrackedTopicsService';

type ProcessorCheckerPromise<T> = (data: T) => Promise<NotificationResult<any>[]>;

interface Processor<T extends ProcessorCheckerPromise<any>> {
  checkerPromise: T;
  jobName: RecipeNames;
  data: Parameters<T>[0];
}

type ProcessorResult = NotificationResult<any>;

interface ProcessorResultWithJob {
  jobName: RecipeNames;
  result: ProcessorResult;
}

interface QueuedNotificationCandidate extends ProcessorResultWithJob {
  notificationKey: string;
  notificationSignature: string;
}

const notificationTypePriority: Record<NotificationType, number> = {
  [NotificationType.POST_MENTION]: 0,
  [NotificationType.TRACKED_TOPIC]: 1,
  [NotificationType.TRACKED_USER]: 2,
  [NotificationType.TRACKED_BOARD]: 3,
  [NotificationType.TRACKED_PHRASE]: 4,
  [NotificationType.AUTO_TRACK_TOPIC_REQUEST]: 5,
  [NotificationType.MERIT]: 6,
  [NotificationType.REMOVE_TOPIC]: 7,
};

function groupByNumberKey<T>(
  items: T[],
  keySelector: (item: T) => number | null | undefined,
): Map<number, T[]> {
  const grouped = new Map<number, T[]>();

  items.forEach((item) => {
    const key = keySelector(item);
    if (key === null || key === undefined) return;

    const current = grouped.get(key) ?? [];
    current.push(item);
    grouped.set(key, current);
  });

  return grouped;
}

function groupByStringKey<T>(
  items: T[],
  keySelector: (item: T) => string | null | undefined,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  items.forEach((item) => {
    const key = keySelector(item)?.toLowerCase();
    if (!key) return;

    const current = grouped.get(key) ?? [];
    current.push(item);
    grouped.set(key, current);
  });

  return grouped;
}

function mapUsersByTelegramId(users: User[]): Map<string, User> {
  return new Map(users.map((user) => [user.telegram_id, user]));
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

@injectable()
export default class CheckPostsService {
  postsVersionRepository = getRepository(PostVersion);

  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,

    @inject('NotificationService')
    private notificationService: NotificationService,
  ) {}

  private async fetchCandidateData() {
    const [posts, uncheckedTopics, postsVersions] = await Promise.all([
      this.postsRepository.findLatestUncheckedPosts(),
      container.resolve(TopicRepository).findUncheckedAndUnnotified(),
      this.postsVersionRepository.find({
        relations: ['post'],
        where: {
          new_content: Not(IsNull()),
          deleted: false,
          post: { date: MoreThanOrEqual(sub(new Date(), { hours: 3 })) },
        },
      }),
    ]);

    return {
      posts,
      uncheckedTopics,
      postsVersions,
    };
  }

  private async fetchSupportData() {
    const ignoredBoardsRepository = getRepository(IgnoredBoard);

    const [
      users,
      trackedBoards,
      trackedUsers,
      trackedPhrases,
      trackedTopics,
      ignoredUsers,
      ignoredTopics,
      ignoredBoards,
      trackedTopicUsersFilters,
    ] = await Promise.all([
      this.usersRepository.getUsersWithMentions(),
      container.resolve(TrackedBoardsRepository).find(),
      container.resolve(TrackedUsersRepository).find(),
      container.resolve(GetTrackedPhrasesService).execute(),
      container.resolve(GetTrackedTopicsService).execute(),
      container.resolve(GetIgnoredUsersService).execute(),
      container.resolve(GetIgnoredTopicsService).execute(),
      ignoredBoardsRepository.find({ relations: ['board'] }),
      container.resolve(TrackedTopicUsersRepository).findAll(),
    ]);

    const trackedTopicTelegramIds = Array.from(
      new Set(trackedTopics.flatMap((topic) => topic.tracking)),
    );
    const trackedTopicUsers = await this.usersRepository.findByTelegramIds(trackedTopicTelegramIds);

    return {
      users,
      trackedBoards,
      trackedUsers,
      trackedPhrases,
      trackedTopics,
      ignoredUsers,
      ignoredTopics,
      ignoredBoards,
      trackedTopicUsers,
      trackedTopicUsersFilters,
    };
  }

  private preparePosts(posts: Post[]): PreparedCheckerPost[] {
    return posts.map((post) => ({
      post,
      preparedMentionContent: preparePostMentionContent(post.content),
    }));
  }

  private preparePostVersions(postsVersions: PostVersion[]): PreparedCheckerPost[] {
    return postsVersions
      .filter((postVersion) => postVersion.new_content)
      .map((postVersion) => ({
        post: {
          ...postVersion.post,
          content: postVersion.new_content!,
          title: postVersion.new_title ?? postVersion.post.title,
        },
        preparedMentionContent: preparePostMentionContent(postVersion.new_content!),
      }));
  }

  private prepareTrackedUserContext(
    trackedUsers: Awaited<ReturnType<TrackedUsersRepository['find']>>,
  ): PreparedTrackedUserContext {
    return {
      trackedUsersByUsername: groupByStringKey(trackedUsers, (trackedUser) => trackedUser.username),
    };
  }

  private prepareTrackedBoardContext(
    trackedBoards: Awaited<ReturnType<TrackedBoardsRepository['find']>>,
    ignoredUsers: Awaited<ReturnType<GetIgnoredUsersService['execute']>>,
  ): PreparedTrackedBoardContext {
    return {
      trackedBoardsByBoardId: groupByNumberKey(
        trackedBoards,
        (trackedBoard) => trackedBoard.board_id,
      ),
      ignoredIndex: createNotificationIgnoreIndex(ignoredUsers, [], []),
    };
  }

  private prepareTrackedTopicContext(
    trackedTopics: Awaited<ReturnType<GetTrackedTopicsService['execute']>>,
    trackedTopicUsers: User[],
    trackedTopicUsersFilters: TrackedTopicUser[],
    ignoredUsers: Awaited<ReturnType<GetIgnoredUsersService['execute']>>,
  ): PreparedTrackedTopicContext {
    return {
      trackedTopicsByTopicId: new Map(
        trackedTopics.map((trackedTopic) => [trackedTopic.topic_id, trackedTopic]),
      ),
      usersByTelegramId: mapUsersByTelegramId(trackedTopicUsers),
      trackedTopicUsersByKey: groupByStringKey(
        trackedTopicUsersFilters,
        (trackedTopicUser) =>
          `${trackedTopicUser.telegram_id}:${trackedTopicUser.tracked_topic_id}`,
      ),
      ignoredIndex: createNotificationIgnoreIndex(ignoredUsers, [], []),
    };
  }

  private prepareTrackedPhrases(
    trackedPhrases: Awaited<ReturnType<GetTrackedPhrasesService['execute']>>,
  ): PreparedTrackedPhrase[] {
    return trackedPhrases.map((trackedPhrase) => ({
      trackedPhrase,
      expression: createMentionRegex(trackedPhrase.phrase),
    }));
  }

  private getResultMetadata(result: ProcessorResult): { post: Post | null; user: User | null } {
    let post: Post | null = null;
    let user: User | null = null;

    if ('post' in result.metadata) {
      post = result.metadata.post;
    } else if ('topic' in result.metadata && 'post' in result.metadata.topic) {
      post = result.metadata.topic.post;
    }

    if ('user' in result.metadata) {
      user = result.metadata.user;
    }

    return { post, user };
  }

  private getNotificationLookupMetadata(
    result: ProcessorResult,
    post: Post,
  ): Record<string, string | number | boolean> | null {
    if (result.type === NotificationType.POST_MENTION) {
      return {
        post_id: post.post_id,
        history: Boolean(result.metadata.history),
      };
    }

    if (result.type === NotificationType.TRACKED_PHRASE) {
      return {
        post_id: post.post_id,
        phrase: result.metadata.trackedPhrase.phrase,
      };
    }

    if (result.type === NotificationType.TRACKED_BOARD) {
      return {
        post_id: post.post_id,
        board_id: result.metadata.trackedBoard.board_id,
      };
    }

    if (result.type === NotificationType.TRACKED_USER) {
      return {
        post_id: post.post_id,
        author: post.author,
      };
    }

    if (result.type === NotificationType.TRACKED_TOPIC) {
      return { post_id: post.post_id };
    }

    if (result.type === NotificationType.AUTO_TRACK_TOPIC_REQUEST && 'topic' in result.metadata) {
      return {
        topic_id: result.metadata.topic.topic_id,
        post_id: result.metadata.topic.post_id,
      };
    }

    return null;
  }

  private buildNotificationSignature(
    type: ProcessorResult['type'],
    telegramId: string,
    metadata: Record<string, string | number | boolean>,
  ): string {
    const metadataSignature = Object.entries(metadata)
      .toSorted(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    return `${type}:${telegramId}:${metadataSignature}`;
  }

  private getUserPostNotificationKey(result: ProcessorResult): string | null {
    const { post, user } = this.getResultMetadata(result);

    if (!post || !user?.telegram_id) return null;

    return `CheckPostsService:${user.telegram_id}:${post.post_id}`;
  }

  private selectPreferredCandidate(
    currentCandidate: QueuedNotificationCandidate | undefined,
    nextCandidate: QueuedNotificationCandidate,
  ): QueuedNotificationCandidate {
    if (!currentCandidate) return nextCandidate;

    return notificationTypePriority[nextCandidate.result.type] <
      notificationTypePriority[currentCandidate.result.type]
      ? nextCandidate
      : currentCandidate;
  }

  private async findExistingUserPostNotificationKeys(
    candidates: QueuedNotificationCandidate[],
  ): Promise<Set<string>> {
    const notificationConditions = new Map<string, { telegram_id: string; post_id: number }>();

    candidates.forEach((candidate) => {
      const { post, user } = this.getResultMetadata(candidate.result);

      if (!post || !user?.telegram_id) return;

      notificationConditions.set(candidate.notificationKey, {
        telegram_id: user.telegram_id,
        post_id: post.post_id,
      });
    });

    const existingKeys = new Set<string>();

    const conditionChunks = chunkArray(Array.from(notificationConditions.values()), 100);

    for (const conditionChunk of conditionChunks) {
      const existingNotifications =
        await this.notificationService.findManyByTelegramAndPostId(conditionChunk);

      existingNotifications.forEach((notification) => {
        const metadata = notification.metadata as { post_id?: number };
        if (!metadata.post_id) return;

        existingKeys.add(`CheckPostsService:${notification.telegram_id}:${metadata.post_id}`);
      });
    }

    return existingKeys;
  }

  private async processResults(results: ProcessorResultWithJob[]): Promise<void> {
    const candidatesByUserPostKey = new Map<string, QueuedNotificationCandidate>();

    for (const item of results) {
      const { post, user } = this.getResultMetadata(item.result);

      if (!post || !user?.telegram_id) continue;

      const notificationMetadata = this.getNotificationLookupMetadata(item.result, post);
      if (!notificationMetadata) continue;

      const notificationSignature = this.buildNotificationSignature(
        item.result.type,
        user.telegram_id,
        notificationMetadata,
      );
      const notificationKey = this.getUserPostNotificationKey(item.result);
      if (!notificationKey) continue;

      const candidate = {
        ...item,
        notificationKey,
        notificationSignature,
      };

      candidatesByUserPostKey.set(
        notificationKey,
        this.selectPreferredCandidate(candidatesByUserPostKey.get(notificationKey), candidate),
      );
    }

    const candidates = Array.from(candidatesByUserPostKey.values());

    if (!candidates.length) return;

    const queueLocks = await this.cacheRepository.recoverMany<boolean>(
      candidates.map((candidate) => candidate.notificationKey),
    );
    const unlockedCandidates = candidates.filter((_, index) => !queueLocks[index]);

    if (!unlockedCandidates.length) return;

    const existingNotificationKeys =
      await this.findExistingUserPostNotificationKeys(unlockedCandidates);
    const candidatesToQueue = unlockedCandidates.filter(
      (candidate) => !existingNotificationKeys.has(candidate.notificationKey),
    );

    if (!candidatesToQueue.length) return;

    for (const candidate of candidatesToQueue) {
      const redisAnswer = await this.cacheRepository.save(
        candidate.notificationKey,
        true,
        'EX',
        60 * 60 * 24,
        'NX',
      );
      if (redisAnswer !== 'OK') {
        logger.error(
          { notificationKey: candidate.notificationKey, redisAnswer },
          'CheckPostsService Job lock did not return OK',
        );
        continue;
      }

      try {
        await addTelegramJob(candidate.jobName, candidate.result.metadata);
      } catch (error) {
        await this.cacheRepository.invalidate(candidate.notificationKey);
        logger.error(
          {
            error,
            jobName: candidate.jobName,
            notificationKey: candidate.notificationKey,
            notificationSignature: candidate.notificationSignature,
          },
          'CheckPostsService failed to enqueue notification job',
        );
      }
    }
  }

  public async execute(): Promise<void> {
    try {
      logger.debug('Starting CheckPostsService');

      const { posts, uncheckedTopics, postsVersions } = await this.fetchCandidateData();

      if (!posts.length && !uncheckedTopics.length && !postsVersions.length) {
        logger.debug('CheckPostsService skipped because there is no candidate work');
        return;
      }

      const {
        users,
        trackedBoards,
        trackedUsers,
        trackedPhrases,
        trackedTopics,
        ignoredUsers,
        ignoredTopics,
        ignoredBoards,
        trackedTopicUsers,
        trackedTopicUsersFilters,
      } = await this.fetchSupportData();

      logger.debug(
        {
          postsCount: posts.length,
          topicsCount: uncheckedTopics.length,
          postsVersionsCount: postsVersions.length,
          usersCount: users.length,
        },
        'Fetched checker data',
      );

      const preparedPosts = this.preparePosts(posts);
      const preparedPostVersions = this.preparePostVersions(postsVersions);
      const preparedTrackedPhrases = this.prepareTrackedPhrases(trackedPhrases);
      const trackedUserContext = this.prepareTrackedUserContext(trackedUsers);
      const trackedBoardContext = this.prepareTrackedBoardContext(trackedBoards, ignoredUsers);
      const trackedTopicContext = this.prepareTrackedTopicContext(
        trackedTopics,
        trackedTopicUsers,
        trackedTopicUsersFilters,
        ignoredUsers,
      );

      const processors = [
        {
          checkerPromise: telegramMentionsChecker,
          jobName: 'sendMentionNotification',
          data: {
            posts: preparedPosts,
            postsVersions: preparedPostVersions,
            users,
            ignoredUsers,
            ignoredTopics,
            ignoredBoards,
          },
        } as Processor<typeof telegramMentionsChecker>,

        {
          checkerPromise: telegramTrackedPhrasesChecker,
          jobName: 'sendPhraseTrackingNotification',
          data: {
            posts,
            trackedPhrases: preparedTrackedPhrases,
            ignoredUsers,
            ignoredTopics,
            ignoredBoards,
          },
        } as Processor<typeof telegramTrackedPhrasesChecker>,

        {
          checkerPromise: telegramTrackedTopicsChecker,
          jobName: 'sendTopicTrackingNotification',
          data: { posts, context: trackedTopicContext },
        } as Processor<typeof telegramTrackedTopicsChecker>,

        {
          checkerPromise: telegramTrackedUsersChecker,
          jobName: 'sendTrackedUserNotification',
          data: { posts, context: trackedUserContext },
        } as Processor<typeof telegramTrackedUsersChecker>,

        {
          checkerPromise: telegramTrackedBoardTopicsChecker,
          jobName: 'sendTrackedBoardNotification',
          data: { topics: uncheckedTopics, context: trackedBoardContext },
        } as Processor<typeof telegramTrackedBoardTopicsChecker>,

        {
          checkerPromise: telegramTrackedUserTopicsChecker,
          jobName: 'sendTrackedUserNotification',
          data: { topics: uncheckedTopics, context: trackedUserContext },
        } as Processor<typeof telegramTrackedUserTopicsChecker>,

        {
          checkerPromise: telegramAutoTrackTopicsChecker,
          jobName: 'sendAutoTrackTopicRequestNotification',
          data: { topics: uncheckedTopics, users },
        } as Processor<typeof telegramAutoTrackTopicsChecker>,
      ];

      const processorResults: ProcessorResultWithJob[] = [];

      for await (const { checkerPromise, data, jobName } of processors) {
        try {
          const results = await checkerPromise(data as never);
          processorResults.push(...results.map((result) => ({ result, jobName })));
        } catch (error) {
          logger.error({ error, data, jobName }, `${jobName} errored`);
        }
      }

      await this.processResults(processorResults);
      await this.postsRepository.markChecked(posts.map((post) => post.post_id));

      logger.debug('CheckPostsService completed successfully');
    } catch (error) {
      logger.error({ error }, 'CheckPostsService failed');
      throw error;
    }
  }
}
