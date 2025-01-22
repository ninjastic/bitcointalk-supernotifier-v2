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

  public async execute(): Promise<void> {
    const posts = await this.postsRepository.findLatestUncheckedPosts();
    const users = await this.usersRepository.getUsersWithMentions();

    const getTrackedTopics = container.resolve(GetTrackedTopicsService);
    const getTrackedPhrases = container.resolve(GetTrackedPhrasesService);

    const trackedBoardsRepository = container.resolve(TrackedBoardsRepository);
    const trackedBoards = await trackedBoardsRepository.find();

    const trackedUsersRepository = container.resolve(TrackedUsersRepository);
    const trackedUsers = await trackedUsersRepository.find();

    const topicRepository = container.resolve(TopicRepository);
    const uncheckedTopics = await topicRepository.findUncheckedAndUnnotified();

    const getIgnoredUsers = container.resolve(GetIgnoredUsersService);
    const getIgnoredTopics = container.resolve(GetIgnoredTopicsService);

    const trackedPhrases = await getTrackedPhrases.execute();
    const trackedTopics = await getTrackedTopics.execute();
    const ignoredUsers = await getIgnoredUsers.execute();
    const ignoredTopics = await getIgnoredTopics.execute();

    type ProcessorItem<CheckerFunction extends (data: object) => Promise<any>> = {
      checkerPromise: CheckerFunction;
      jobName: RecipeNames;
      data: Parameters<CheckerFunction>[0];
    };

    const processors: ProcessorItem<any>[] = [];

    for (const post of posts) {
      // Mentions
      processors.push({
        checkerPromise: telegramMentionsChecker,
        jobName: 'sendMentionNotification',
        data: { post, users, ignoredUsers, ignoredTopics }
      } as ProcessorItem<typeof telegramMentionsChecker>);

      // Tracked Phrases
      processors.push({
        checkerPromise: telegramTrackedPhrasesChecker,
        jobName: 'sendPhraseTrackingNotification',
        data: { post, trackedPhrases, ignoredUsers, ignoredTopics }
      } as ProcessorItem<typeof telegramTrackedPhrasesChecker>);

      // Tracked Topics
      processors.push({
        checkerPromise: telegramTrackedTopicsChecker,
        jobName: 'sendTopicTrackingNotification',
        data: { post, trackedTopics, ignoredUsers }
      } as ProcessorItem<typeof telegramTrackedTopicsChecker>);

      // Tracked Users (Posts)
      processors.push({
        checkerPromise: telegramTrackedUsersChecker,
        jobName: 'sendTrackedUserNotification',
        data: { post, trackedUsers }
      } as ProcessorItem<typeof telegramTrackedUsersChecker>);
    }

    for await (const topic of uncheckedTopics) {
      // Tracked Boards
      processors.push({
        checkerPromise: telegramTrackedBoardTopicsChecker,
        jobName: 'sendTrackedBoardNotification',
        data: { topic, trackedBoards, ignoredUsers }
      } as ProcessorItem<typeof telegramTrackedBoardTopicsChecker>);

      // Tracked Users (Topics)
      processors.push({
        checkerPromise: telegramTrackedUserTopicsChecker,
        jobName: 'sendTrackedUserNotification',
        data: { topic, trackedUsers }
      } as ProcessorItem<typeof telegramTrackedUserTopicsChecker>);

      // Auto Track Own Topic
      processors.push({
        checkerPromise: telegramAutoTrackTopicsChecker,
        jobName: 'sendAutoTrackTopicRequestNotification',
        data: { topic, users }
      } as ProcessorItem<typeof telegramAutoTrackTopicsChecker>);
    }

    const postNotificationSet = new Set<string>();
    for await (const { checkerPromise, data, jobName } of processors) {
      const results = await checkerPromise(data).catch(err => {
        logger.error({ err, data, jobName }, `${jobName} errored`);
        throw err;
      });

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
          .where('notification.type = :type', { type: 'post_mention' })
          .andWhere('notification.telegram_id = :telegramId', { telegramId: result.metadata.user.telegram_id })
          .andWhere(`notification.metadata->>'post_id' = :postId`, { postId: result.metadata.post.post_id })
          .getOne();

        if (postNotified) continue;

        await addTelegramJob(jobName, result.metadata);
      }
    }

    for await (const post of posts) {
      post.checked = true;
      await this.postsRepository.save(post);
      logger.debug({ post }, 'Saved checked post');
    }
  }
}
