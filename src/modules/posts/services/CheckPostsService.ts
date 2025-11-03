import { container, inject, injectable } from 'tsyringe';
import { getRepository, IsNull, MoreThanOrEqual, Not } from 'typeorm';
import { sub } from 'date-fns';

import Post from '##/modules/posts/infra/typeorm/entities/Post';
import User from '##/modules/users/infra/typeorm/entities/User';
import { NotificationService } from '##/modules/posts/services/notification-service';
import GetIgnoredUsersService from '##/modules/users/services/GetIgnoredUsersService';
import logger from '../../../shared/services/logger';
import { addTelegramJob } from '../../../shared/infra/bull/queues/telegramQueue';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IPostsRepository from '../repositories/IPostsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';

import GetIgnoredTopicsService from './GetIgnoredTopicsService';
import GetTrackedTopicsService from './GetTrackedTopicsService';
import GetTrackedPhrasesService from './GetTrackedPhrasesService';
import TrackedBoardsRepository from '../infra/typeorm/repositories/TrackedBoardsRepository';
import TopicRepository from '../infra/typeorm/repositories/TopicRepository';
import TrackedUsersRepository from '../infra/typeorm/repositories/TrackedUsersRepository';
import { telegramMentionsChecker } from './checkers/posts/telegram/mentions';
import { telegramTrackedPhrasesChecker } from './checkers/posts/telegram/trackedPhrases';
import { telegramTrackedTopicsChecker } from './checkers/posts/telegram/trackedTopics';
import { telegramTrackedUsersChecker } from './checkers/posts/telegram/trackedUsers';
import { telegramTrackedBoardTopicsChecker } from './checkers/posts/telegram/trackedBoardTopics';
import { telegramTrackedUserTopicsChecker } from './checkers/posts/telegram/trackedUserTopics';
import { telegramAutoTrackTopicsChecker } from './checkers/posts/telegram/autoTrackTopics';
import { NotificationResult, RecipeNames } from '../../../shared/infra/bull/types/telegram';
import PostVersion from '##/modules/posts/infra/typeorm/entities/PostVersion';
import IgnoredBoard from '../infra/typeorm/entities/IgnoredBoard';

type ProcessorCheckerPromise<T> = (data: T) => Promise<NotificationResult<any>[]>;

type Processor<T extends ProcessorCheckerPromise<any>> = {
  checkerPromise: T;
  jobName: RecipeNames;
  data: Parameters<T>[0];
};

type ProcessorResult = NotificationResult<any>;

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
    private notificationService: NotificationService
  ) {}

  private async fetchData() {
    const ignoredBoardsRepository = getRepository(IgnoredBoard);

    const posts = await this.postsRepository.findLatestUncheckedPosts();
    const users = await this.usersRepository.getUsersWithMentions();
    const trackedBoards = await container.resolve(TrackedBoardsRepository).find();
    const trackedUsers = await container.resolve(TrackedUsersRepository).find();
    const uncheckedTopics = await container.resolve(TopicRepository).findUncheckedAndUnnotified();
    const trackedPhrases = await container.resolve(GetTrackedPhrasesService).execute();
    const trackedTopics = await container.resolve(GetTrackedTopicsService).execute();
    const ignoredUsers = await container.resolve(GetIgnoredUsersService).execute();
    const ignoredTopics = await container.resolve(GetIgnoredTopicsService).execute();
    const ignoredBoards = await ignoredBoardsRepository.find({ relations: ['board'] });

    const postsVersions = await this.postsVersionRepository.find({
      relations: ['post'],
      where: {
        new_content: Not(IsNull()),
        deleted: false,
        post: { date: MoreThanOrEqual(sub(new Date(), { hours: 3 })) }
      }
    });

    return {
      posts,
      users,
      trackedBoards,
      trackedUsers,
      uncheckedTopics,
      trackedPhrases,
      trackedTopics,
      ignoredUsers,
      ignoredTopics,
      ignoredBoards,
      postsVersions
    };
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

  private async shouldProcessNotification(
    result: ProcessorResult,
    notificationKey: string,
    post: Post,
    user: User
  ): Promise<boolean> {
    const isJobAlreadyInQueue = await this.cacheRepository.recover(notificationKey);
    if (isJobAlreadyInQueue) return false;

    const redisAnswer = await this.cacheRepository.save(notificationKey, true, 'EX', 60 * 60 * 24);
    if (redisAnswer !== 'OK') {
      logger.error({ notificationKey, redisAnswer }, 'CheckPostsService Job lock did not return OK');
      return false;
    }

    const notificationExists = await this.notificationService.findOne({
      type: result.type,
      telegram_id: user.telegram_id,
      metadata: { post_id: post.id }
    });

    return !notificationExists;
  }

  private async processResults(results: ProcessorResult[], jobName: RecipeNames, postNotificationSet: Set<string>) {
    for await (const result of results) {
      const { post, user } = this.getResultMetadata(result);

      if (!post || !user.telegram_id) continue;

      const notificationKey = `CheckPostsService:${result.userId}:${post.id}`;
      if (postNotificationSet.has(notificationKey)) continue;

      postNotificationSet.add(notificationKey);

      const shouldNotify = await this.shouldProcessNotification(result, notificationKey, post, user);
      if (!shouldNotify) continue;

      await addTelegramJob(jobName, result.metadata);
    }
  }

  public async execute(): Promise<void> {
    try {
      logger.debug('Starting CheckPostsService');

      const {
        posts,
        users,
        trackedBoards,
        trackedUsers,
        uncheckedTopics,
        trackedPhrases,
        trackedTopics,
        ignoredUsers,
        ignoredTopics,
        ignoredBoards,
        postsVersions
      } = await this.fetchData();

      logger.debug({ postsCount: posts.length, usersCount: users.length }, 'Fetched data');

      const processors = [
        {
          checkerPromise: telegramMentionsChecker,
          jobName: 'sendMentionNotification',
          data: { posts, postsVersions, users, ignoredUsers, ignoredTopics, ignoredBoards }
        } as Processor<typeof telegramMentionsChecker>,

        {
          checkerPromise: telegramTrackedPhrasesChecker,
          jobName: 'sendPhraseTrackingNotification',
          data: { posts, trackedPhrases, ignoredUsers, ignoredTopics, ignoredBoards }
        } as Processor<typeof telegramTrackedPhrasesChecker>,

        {
          checkerPromise: telegramTrackedTopicsChecker,
          jobName: 'sendTopicTrackingNotification',
          data: { posts, trackedTopics, ignoredUsers }
        } as Processor<typeof telegramTrackedTopicsChecker>,

        {
          checkerPromise: telegramTrackedUsersChecker,
          jobName: 'sendTrackedUserNotification',
          data: { posts, trackedUsers }
        } as Processor<typeof telegramTrackedUsersChecker>,

        {
          checkerPromise: telegramTrackedBoardTopicsChecker,
          jobName: 'sendTrackedBoardNotification',
          data: { topics: uncheckedTopics, trackedBoards, ignoredUsers }
        } as Processor<typeof telegramTrackedBoardTopicsChecker>,

        {
          checkerPromise: telegramTrackedUserTopicsChecker,
          jobName: 'sendTrackedUserNotification',
          data: { topics: uncheckedTopics, trackedUsers }
        } as Processor<typeof telegramTrackedUserTopicsChecker>,

        {
          checkerPromise: telegramAutoTrackTopicsChecker,
          jobName: 'sendAutoTrackTopicRequestNotification',
          data: { topics: uncheckedTopics, users }
        } as Processor<typeof telegramAutoTrackTopicsChecker>
      ];

      const postNotificationSet = new Set<string>();

      for await (const { checkerPromise, data, jobName } of processors) {
        try {
          const results = await checkerPromise(data as any);
          await this.processResults(results, jobName, postNotificationSet);
        } catch (error) {
          logger.error({ error, data, jobName }, `${jobName} errored`);
        }
      }

      for await (const post of posts) {
        post.checked = true;
        await this.postsRepository.save(post);
        logger.debug({ post }, 'Saved checked post');
      }

      logger.debug('CheckPostsService completed successfully');
    } catch (error) {
      logger.error({ error }, 'CheckPostsService failed');
      throw error;
    }
  }
}
