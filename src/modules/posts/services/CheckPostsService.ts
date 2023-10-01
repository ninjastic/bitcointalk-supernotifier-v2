import { container, inject, injectable } from 'tsyringe';

import telegramQueue from '../../../shared/infra/bull/queues/telegramQueue';

import IPostsRepository from '../repositories/IPostsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';
import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';

import GetIgnoredUsersService from '../../users/services/GetIgnoredUsersService';
import GetIgnoredTopicsService from './GetIgnoredTopicsService';
import GetTrackedTopicsService from './GetTrackedTopicsService';
import GetTrackedPhrasesService from './GetTrackedPhrasesService';
import FindTrackedTopicUsersService from '../../../shared/infra/telegram/services/FindTrackedTopicUsersService';
import TrackedBoardsRepository from '../infra/typeorm/repositories/TrackedBoardsRepository';
import TopicRepository from '../infra/typeorm/repositories/TopicRepository';
import TrackedUsersRepository from '../infra/typeorm/repositories/TrackedUsersRepository';
import NotificationRepository from '../../notifications/infra/typeorm/repositories/NotificationRepository';

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

    const notificationRepository = new NotificationRepository();

    const escapeRegexText = (text: string) => text.replace(/([<>*()?])/g, '\\$1');

    const postsCheckingCache =
      [] ?? (await this.cacheProvider.recoverMany<number>(posts.map(post => `postChecking:${post.post_id}`)));
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

        const usernameRegex = new RegExp(`(?<!\\w)${escapeRegexText(user.username)}(?!\\w)`, 'gi');
        const altUsernameRegex = user.alternative_usernames.length
          ? new RegExp(`(?<!\\w)${escapeRegexText(user.alternative_usernames[0])}(?!\\w)`, 'gi')
          : null;
        const backupAtSignRegex = new RegExp(`@${escapeRegexText(user.username)}`, 'gi');
        const backupQuotedRegex = new RegExp(`Quote from: ${escapeRegexText(user.username)} on`, 'gi');

        const regexList = [usernameRegex, altUsernameRegex, backupAtSignRegex, backupQuotedRegex];

        if (!regexList.find(regex => post.content.match(regex))) {
          continue;
        }

        const notificationData = {
          telegram_id: user.telegram_id,
          type: 'post_mention',
          metadata: { post_id: post.post_id }
        };

        const isSameUsername = post.author.toLowerCase() === user.username.toLowerCase();
        const isSameUid = post.author_uid === user.user_id;
        const isAlreadyNotified =
          post.notified_to.includes(user.telegram_id) ||
          postsNotified.has(`${post.post_id}:${user.telegram_id}`) ||
          (await notificationRepository.findOne({ where: notificationData }));
        const isAuthorIgnored = ignoredUsers
          .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
          ?.ignoring.includes(user.telegram_id);
        const isTopicIgnored = ignoredTopics
          .find(ignoredTopic => ignoredTopic.topic_id === post.topic_id)
          ?.ignoring.includes(user.telegram_id);

        if (isSameUsername || isSameUid || isAlreadyNotified || isAuthorIgnored || isTopicIgnored) {
          continue;
        }

        const notification = notificationRepository.create(notificationData);
        await notificationRepository.save(notification);

        postsNotified.add(`${post.post_id}:${user.telegram_id}`);
        await telegramQueue.add('sendMentionNotification', { post, user });
      }

      // Tracked Phrases
      for await (const trackedPhrase of trackedPhrases) {
        const { user, phrase } = trackedPhrase;
        const phraseRegex = new RegExp(`(?<!\\w)${escapeRegexText(phrase)}(?!\\w)`, 'gi');

        if (!post.content.match(phraseRegex)) {
          continue;
        }

        const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
        const isSameUid = user.user_id && post.author_uid === user.user_id;
        const isAlreadyNotified =
          post.notified_to.includes(user.telegram_id) ||
          postsNotified.has(`${post.post_id}:${user.telegram_id}`) ||
          (await notificationRepository.findOne({
            where: {
              type: 'tracked_phrase',
              telegram_id: user.telegram_id,
              metadata: { post_id: post.post_id, tracked_phrase_id: trackedPhrase.id }
            }
          }));
        const isAuthorIgnored = ignoredUsers
          .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
          ?.ignoring.includes(user.telegram_id);
        const isTopicIgnored = ignoredTopics
          .find(ignoredTopic => ignoredTopic.topic_id === post.topic_id)
          ?.ignoring.includes(user.telegram_id);

        if (isSameUsername || isSameUid || isAlreadyNotified || isAuthorIgnored || isTopicIgnored) {
          continue;
        }

        const notification = notificationRepository.create({
          telegram_id: user.telegram_id,
          type: 'tracked_phrase',
          metadata: { post_id: post.post_id, tracked_phrase_id: trackedPhrase.id }
        });
        await notificationRepository.save(notification);

        postsNotified.add(`${post.post_id}:${user.telegram_id}`);
        await telegramQueue.add('sendPhraseTrackingNotification', {
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

          const notificationData = {
            telegram_id: user.telegram_id,
            type: 'tracked_topic',
            metadata: { post_id: post.post_id }
          };

          const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
          const isSameUid = user.user_id && post.author_uid === user.user_id;
          const isAlreadyNotified =
            post.notified_to.includes(user.telegram_id) ||
            postsNotified.has(`${post.post_id}:${user.telegram_id}`) ||
            (await notificationRepository.findOne({ where: notificationData }));
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

          const notification = notificationRepository.create(notificationData);
          await notificationRepository.save(notification);

          postsNotified.add(`${post.post_id}:${user.telegram_id}`);
          await telegramQueue.add('sendTopicTrackingNotification', { post, user });
        }
      }

      // Tracked Users (Posts)
      const trackedUsersWithMatchingPosts = trackedUsers.filter(
        trackedUser => !trackedUser.only_topics && trackedUser.username.toLowerCase() === post.author.toLowerCase()
      );
      for await (const trackedUser of trackedUsersWithMatchingPosts) {
        const { user } = trackedUser;

        const notificationData = {
          telegram_id: user.telegram_id,
          type: 'tracked_user',
          metadata: { post_id: post.post_id }
        };

        const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
        const isSameUid = user.user_id && post.author_uid === user.user_id;
        const isAlreadyNotified =
          post.notified_to.includes(user.telegram_id) ||
          postsNotified.has(`${post.post_id}:${user.telegram_id}`) ||
          (await notificationRepository.findOne({ where: notificationData }));

        if (isSameUsername || isSameUid || isAlreadyNotified) {
          continue;
        }

        const notification = notificationRepository.create(notificationData);
        await notificationRepository.save(notification);

        postsNotified.add(`${post.post_id}:${user.telegram_id}`);
        await telegramQueue.add('sendTrackedUserNotification', { post, user });
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

        const notificationData = {
          telegram_id: user.telegram_id,
          type: 'tracked_board',
          metadata: { post_id: post.post_id, tracked_board_id: trackedBoard.id }
        };

        const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
        const isSameUid = user.user_id && post.author_uid === user.user_id;
        const isAlreadyNotified =
          post.notified_to.includes(user.telegram_id) ||
          postsNotified.has(`${post.post_id}:${user.telegram_id}`) ||
          (await notificationRepository.findOne({ where: notificationData }));

        const isAuthorIgnored = ignoredUsers
          .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
          ?.ignoring.includes(user.telegram_id);

        if (isSameUsername || isSameUid || isAlreadyNotified || isAuthorIgnored) {
          continue;
        }

        const notification = notificationRepository.create(notificationData);
        await notificationRepository.save(notification);

        postsNotified.add(`${post.post_id}:${user.telegram_id}`);
        await telegramQueue.add('sendTrackedBoardNotification', { post, user, trackedBoard });
      }

      // Tracked Users (Topics)
      const trackedUsersWithMatchingTopics = trackedUsers.filter(
        trackedUser => trackedUser.only_topics && trackedUser.username.toLowerCase() === topic.post.author.toLowerCase()
      );
      for await (const trackedUser of trackedUsersWithMatchingTopics) {
        const { user } = trackedUser;
        const { post } = topic;

        const notificationData = {
          telegram_id: user.telegram_id,
          type: 'tracked_user',
          metadata: { post_id: post.post_id }
        };

        const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
        const isSameUid = user.user_id && post.author_uid === user.user_id;
        const isAlreadyNotified =
          post.notified_to.includes(user.telegram_id) ||
          postsNotified.has(`${post.post_id}:${user.telegram_id}`) ||
          (await notificationRepository.findOne({ where: notificationData }));

        if (isSameUsername || isSameUid || isAlreadyNotified) {
          continue;
        }

        const notification = notificationRepository.create(notificationData);
        await notificationRepository.save(notification);

        postsNotified.add(`${post.post_id}:${user.telegram_id}`);
        await telegramQueue.add('sendTrackedUserNotification', { post_id: post, user });
      }
    }

    for await (const post of uncheckedPosts) {
      post.checked = true;
      await this.postsRepository.save(post);
    }
  }
}
