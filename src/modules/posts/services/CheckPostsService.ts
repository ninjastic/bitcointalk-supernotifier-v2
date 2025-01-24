import { container, inject, injectable } from 'tsyringe';
import { getRepository } from 'typeorm';

import { addTelegramJob } from '../../../shared/infra/bull/queues/telegramQueue';
import logger from '../../../shared/services/logger';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IPostsRepository from '../repositories/IPostsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';

import Notification from '../../notifications/infra/typeorm/entities/Notification';
import GetIgnoredUsersService from '../../users/services/GetIgnoredUsersService';
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
import { RecipeNames } from '../../../shared/infra/bull/types/telegram';
import { telegramAutoTrackTopicsChecker } from './checkers/posts/telegram/autoTrackTopics';

type ProcessorItem<CheckerFunction extends (data: object) => Promise<any>> = {
  checkerPromise: CheckerFunction;
  jobName: RecipeNames;
  data: Parameters<CheckerFunction>[0];
};

@injectable()
export default class CheckPostsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  private async fetchData() {
    const posts = await this.postsRepository.findLatestUncheckedPosts();
    const users = await this.usersRepository.getUsersWithMentions();
    const trackedBoards = await container.resolve(TrackedBoardsRepository).find();
    const trackedUsers = await container.resolve(TrackedUsersRepository).find();
    const uncheckedTopics = await container.resolve(TopicRepository).findUncheckedAndUnnotified();
    const trackedPhrases = await container.resolve(GetTrackedPhrasesService).execute();
    const trackedTopics = await container.resolve(GetTrackedTopicsService).execute();
    const ignoredUsers = await container.resolve(GetIgnoredUsersService).execute();
    const ignoredTopics = await container.resolve(GetIgnoredTopicsService).execute();

    return {
      posts,
      users,
      trackedBoards,
      trackedUsers,
      uncheckedTopics,
      trackedPhrases,
      trackedTopics,
      ignoredUsers,
      ignoredTopics
    };
  }

  private async processResults(results: any[], jobName: RecipeNames, postNotificationSet: Set<string>) {
    for await (const result of results) {
      if (!('post' in result.metadata) || !result.metadata.user.telegram_id) continue;

      const postUserKey = `CheckPostsService:${result.userId}:${result.metadata.post.id}`;
      if (postNotificationSet.has(postUserKey)) continue;

      postNotificationSet.add(postUserKey);

      const isJobAlreadyInQueue = await this.cacheRepository.recover(postUserKey);
      if (isJobAlreadyInQueue) continue;

      const redisAnswer = await this.cacheRepository.save(postUserKey, true, 'EX', 1800);
      if (redisAnswer !== 'OK') {
        logger.error('CheckPostsService Job lock did not return OK', { postUserKey, redisAnswer });
        continue;
      }

      const postNotified = await getRepository(Notification)
        .createQueryBuilder('notification')
        .where('notification.type = :type', { type: result.type })
        .andWhere('notification.telegram_id = :telegramId', { telegramId: result.metadata.user.telegram_id })
        .andWhere(`notification.metadata->>'post_id' = :postId`, { postId: result.metadata.post.post_id })
        .getOne();

      if (postNotified) continue;

      await addTelegramJob(jobName, result.metadata);
    }
  }

  public async execute(): Promise<void> {
    try {
      logger.info('Starting CheckPostsService');

      const {
        posts,
        users,
        trackedBoards,
        trackedUsers,
        uncheckedTopics,
        trackedPhrases,
        trackedTopics,
        ignoredUsers,
        ignoredTopics
      } = await this.fetchData();

      logger.debug({ postsCount: posts.length, usersCount: users.length }, 'Fetched data');

      const processors: ProcessorItem<any>[] = [];

      // Mentions
      processors.push({
        checkerPromise: telegramMentionsChecker,
        jobName: 'sendMentionNotification',
        data: { posts, users, ignoredUsers, ignoredTopics }
      } as ProcessorItem<typeof telegramMentionsChecker>);

      // Tracked Phrases
      processors.push({
        checkerPromise: telegramTrackedPhrasesChecker,
        jobName: 'sendPhraseTrackingNotification',
        data: { posts, trackedPhrases, ignoredUsers, ignoredTopics }
      } as ProcessorItem<typeof telegramTrackedPhrasesChecker>);

      // Tracked Topics
      processors.push({
        checkerPromise: telegramTrackedTopicsChecker,
        jobName: 'sendTopicTrackingNotification',
        data: { posts, trackedTopics, ignoredUsers }
      } as ProcessorItem<typeof telegramTrackedTopicsChecker>);

      // Tracked Users (Posts)
      processors.push({
        checkerPromise: telegramTrackedUsersChecker,
        jobName: 'sendTrackedUserNotification',
        data: { posts, trackedUsers }
      } as ProcessorItem<typeof telegramTrackedUsersChecker>);

      // Tracked Boards
      processors.push({
        checkerPromise: telegramTrackedBoardTopicsChecker,
        jobName: 'sendTrackedBoardNotification',
        data: { topics: uncheckedTopics, trackedBoards, ignoredUsers }
      } as ProcessorItem<typeof telegramTrackedBoardTopicsChecker>);

      // Tracked Users (Topics)
      processors.push({
        checkerPromise: telegramTrackedUserTopicsChecker,
        jobName: 'sendTrackedUserNotification',
        data: { topics: uncheckedTopics, trackedUsers }
      } as ProcessorItem<typeof telegramTrackedUserTopicsChecker>);

      // Auto Track Own Topic
      processors.push({
        checkerPromise: telegramAutoTrackTopicsChecker,
        jobName: 'sendAutoTrackTopicRequestNotification',
        data: { topics: uncheckedTopics, users }
      } as ProcessorItem<typeof telegramAutoTrackTopicsChecker>);

      const postNotificationSet = new Set<string>();

      for await (const { checkerPromise, data, jobName } of processors) {
        try {
          const results = await checkerPromise(data);
          await this.processResults(results, jobName, postNotificationSet);
        } catch (err) {
          logger.error({ err, data, jobName }, `${jobName} errored`);
        }
      }

      for await (const post of posts) {
        post.checked = true;
        await this.postsRepository.save(post);
        logger.debug({ post }, 'Saved checked post');
      }

      logger.info('CheckPostsService completed successfully');
    } catch (err) {
      logger.error({ err }, 'CheckPostsService failed');
      throw err;
    }
  }
}
