import { container, inject, injectable } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import IPostsRepository from '../repositories/IPostsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';
import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';

import SetPostCheckedService from './SetPostCheckedService';
import GetIgnoredUsersService from '../../users/services/GetIgnoredUsersService';
import GetIgnoredTopicsService from './GetIgnoredTopicsService';
import GetTrackedTopicsService from './GetTrackedTopicsService';
import GetTrackedPhrasesService from './GetTrackedPhrasesService';
import FindTrackedTopicUsersService from '../../../shared/infra/telegram/services/FindTrackedTopicUsersService';
import TrackedBoardsRepository from '../infra/typeorm/repositories/TrackedBoardsRepository';
import TopicRepository from '../infra/typeorm/repositories/TopicRepository';
import TrackedUsersRepository from '../infra/typeorm/repositories/TrackedUsersRepository';

@injectable()
export default class CheckPostsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    @inject('CacheRepository')
    private cacheProvider: ICacheProvider
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

    const findTrackedTopicUsers = container.resolve(FindTrackedTopicUsersService);
    const getIgnoredUsers = container.resolve(GetIgnoredUsersService);
    const getIgnoredTopics = container.resolve(GetIgnoredTopicsService);

    const trackedPhrases = await getTrackedPhrases.execute();
    const trackedTopics = await getTrackedTopics.execute();
    const ignoredUsers = await getIgnoredUsers.execute();
    const ignoredTopics = await getIgnoredTopics.execute();

    const setPostChecked = container.resolve(SetPostCheckedService);

    const scapeRegexText = (text: string) => text.replace(/([<>*()?])/g, '\\$1');

    const queue = new Queue('TelegramQueue', {
      redis: cacheConfig.config.redis,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true }
    });

    const postsCheckingCache = await this.cacheProvider.recoverMany<number>(posts.map(post => String(post.post_id)));
    const uncheckedPosts = posts.filter(post => !postsCheckingCache.includes(post.post_id));

    await this.cacheProvider.saveMany(
      posts.map(({ post_id }) => ({
        key: `postChecking:${post_id}`,
        value: post_id,
        arg: 'EX',
        time: 300
      }))
    );

    const postsNotified = new Set<string>();

    for await (const post of uncheckedPosts) {
      // Mentions
      for await (const user of users) {
        if (!user.username) {
          continue;
        }

        const usernameRegex = new RegExp(`(?<!\\w)${scapeRegexText(user.username)}(?!\\w)`, 'gi');
        const altUsernameRegex = user.alternative_usernames.length
          ? new RegExp(`(?<!\\w)${scapeRegexText(user.alternative_usernames[0])}(?!\\w)`, 'gi')
          : null;
        const backupAtSignRegex = new RegExp(`@${scapeRegexText(user.username)}`, 'gi');
        const backupQuotedRegex = new RegExp(`Quote from: ${scapeRegexText(user.username)} on`, 'gi');

        const regexList = [usernameRegex, altUsernameRegex, backupAtSignRegex, backupQuotedRegex];

        if (!regexList.find(regex => post.content.match(regex))) {
          continue;
        }

        const isSameUsername = post.author.toLowerCase() === user.username.toLowerCase();
        const isSameUid = post.author_uid === user.user_id;
        const isAlreadyNotified =
          post.notified_to.includes(user.telegram_id) || postsNotified.has(`${post.post_id}:${user.telegram_id}`);
        const isAuthorIgnored = ignoredUsers
          .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
          ?.ignoring.includes(user.telegram_id);
        const isTopicIgnored = ignoredTopics
          .find(ignoredTopic => ignoredTopic.topic_id === post.topic_id)
          ?.ignoring.includes(user.telegram_id);

        if (isSameUsername || isSameUid || isAlreadyNotified || isAuthorIgnored || isTopicIgnored) {
          continue;
        }

        postsNotified.add(`${post.post_id}:${user.telegram_id}`);
        await queue.add('sendMentionNotification', { post, user });
      }

      // Tracked Phrases
      for await (const trackedPhrase of trackedPhrases) {
        const { user, phrase } = trackedPhrase;
        const phraseRegex = new RegExp(`(?<!\\w)${scapeRegexText(phrase)}(?!\\w)`, 'gi');

        if (!post.content.match(phraseRegex)) {
          continue;
        }

        const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
        const isSameUid = user.user_id && post.author_uid === user.user_id;
        const isAlreadyNotified =
          post.notified_to.includes(user.telegram_id) || postsNotified.has(`${post.post_id}:${user.telegram_id}`);
        const isAuthorIgnored = ignoredUsers
          .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
          ?.ignoring.includes(user.telegram_id);
        const isTopicIgnored = ignoredTopics
          .find(ignoredTopic => ignoredTopic.topic_id === post.topic_id)
          ?.ignoring.includes(user.telegram_id);

        if (isSameUsername || isSameUid || isAlreadyNotified || isAuthorIgnored || isTopicIgnored) {
          continue;
        }

        postsNotified.add(`${post.post_id}:${user.telegram_id}`);
        await queue.add('sendPhraseTrackingNotification', {
          post,
          user,
          trackedPhrase
        });
      }

      // Tracked Topics
      const trackedTopic = trackedTopics.find(_trackedTopic => _trackedTopic.topic_id === post.topic_id);
      if (trackedTopic) {
        for await (const trackingTelegramId of trackedTopic.tracking) {
          const user = await this.usersRepository.findByTelegramId(trackingTelegramId);

          const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
          const isSameUid = user.user_id && post.author_uid === user.user_id;
          const isAlreadyNotified =
            post.notified_to.includes(user.telegram_id) || postsNotified.has(`${post.post_id}:${user.telegram_id}`);
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

          postsNotified.add(`${post.post_id}:${user.telegram_id}`);
          await queue.add('sendTopicTrackingNotification', { post, user });
        }
      }

      // Tracked Users (Posts)
      const trackedUsersWithMatchingPosts = trackedUsers.filter(
        trackedUser => !trackedUser.only_topics && trackedUser.username.toLowerCase() === post.author.toLowerCase()
      );
      for await (const trackedUser of trackedUsersWithMatchingPosts) {
        const { user } = trackedUser;

        const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
        const isSameUid = user.user_id && post.author_uid === user.user_id;
        const isAlreadyNotified =
          post.notified_to.includes(user.telegram_id) || postsNotified.has(`${post.post_id}:${user.telegram_id}`);

        if (isSameUsername || isSameUid || isAlreadyNotified) {
          continue;
        }

        postsNotified.add(`${post.post_id}:${user.telegram_id}`);
        await queue.add('sendTrackedUserNotification', { post, user });
      }
    }

    for await (const topic of uncheckedTopics) {
      // Tracked Boards
      const trackedBoardsWithMatchingTopics = trackedBoards.filter(
        trackedBoard => trackedBoard.board_id === topic.post.board_id
      );
      for await (const trackedBoard of trackedBoardsWithMatchingTopics) {
        const { user } = trackedBoard;
        const { post } = topic;

        const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
        const isSameUid = user.user_id && post.author_uid === user.user_id;
        const isAlreadyNotified =
          post.notified_to.includes(user.telegram_id) || postsNotified.has(`${post.post_id}:${user.telegram_id}`);
        const isAuthorIgnored = ignoredUsers
          .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
          ?.ignoring.includes(user.telegram_id);

        if (isSameUsername || isSameUid || isAlreadyNotified || isAuthorIgnored) {
          continue;
        }

        postsNotified.add(`${post.post_id}:${user.telegram_id}`);
        await queue.add('sendTrackedBoardNotification', { post, user, trackedBoard });
      }

      // Tracked Users (Topics)
      const trackedUsersWithMatchingTopics = trackedUsers.filter(
        trackedUser => trackedUser.only_topics && trackedUser.username.toLowerCase() === topic.post.author.toLowerCase()
      );
      for await (const trackedUser of trackedUsersWithMatchingTopics) {
        const { user } = trackedUser;
        const { post } = topic;

        const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
        const isSameUid = user.user_id && post.author_uid === user.user_id;
        const isAlreadyNotified =
          post.notified_to.includes(user.telegram_id) || postsNotified.has(`${post.post_id}:${user.telegram_id}`);

        if (isSameUsername || isSameUid || isAlreadyNotified) {
          continue;
        }

        postsNotified.add(`${post.post_id}:${user.telegram_id}`);
        await queue.add('sendTrackedUserNotification', { post, user });
      }
    }

    await queue.close();

    const setPostsCheckedPromises = uncheckedPosts.map(async post => setPostChecked.execute(post.post_id));
    await Promise.allSettled(setPostsCheckedPromises);
  }
}
