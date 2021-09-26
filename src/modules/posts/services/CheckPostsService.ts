import { container, inject, injectable } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import IPostsRepository from '../repositories/IPostsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';
import IWebUsersRepository from '../../web/repositories/IWebUsersRepository';
import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';

import SetPostCheckedService from './SetPostCheckedService';
import GetTrackedTopicsService from './GetTrackedTopicsService';
import GetIgnoredUsersService from '../../users/services/GetIgnoredUsersService';
import GetIgnoredTopicsService from './GetIgnoredTopicsService';
import GetTrackedPhrasesService from './GetTrackedPhrasesService';
import CreateWebNotificationService from '../../web/services/CreateWebNotificationService';
import FindTrackedTopicUsersService from '../../../shared/infra/telegram/services/FindTrackedTopicUsersService';

@injectable()
export default class CheckPostsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    @inject('WebUsersRepository')
    private webUsersRepository: IWebUsersRepository,

    @inject('CacheRepository')
    private cacheProvider: ICacheProvider,
  ) {}

  public async execute(): Promise<void> {
    const posts = await this.postsRepository.findLatestUncheckedPosts(30);
    const webUsers = await this.webUsersRepository.findAll();
    const users = await this.usersRepository.getUsersWithMentions();

    const getTrackedPhrases = container.resolve(GetTrackedPhrasesService);

    const getTrackedTopics = container.resolve(GetTrackedTopicsService);
    const findTrackedTopicUsers = container.resolve(
      FindTrackedTopicUsersService,
    );
    const getIgnoredUsers = container.resolve(GetIgnoredUsersService);
    const getIgnoredTopics = container.resolve(GetIgnoredTopicsService);

    const trackedPhrases = await getTrackedPhrases.execute();
    const trackedTopics = await getTrackedTopics.execute();
    const ignoredUsers = await getIgnoredUsers.execute();
    const ignoredTopics = await getIgnoredTopics.execute();

    const setPostChecked = container.resolve(SetPostCheckedService);
    const createWebNotification = container.resolve(
      CreateWebNotificationService,
    );

    const queue = new Queue('TelegramQueue', {
      redis: cacheConfig.config.redis,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
    });

    await Promise.all(
      posts.map(async post => {
        await setPostChecked.execute(post.post_id);

        await Promise.all(
          trackedPhrases.map(async trackedPhrase => {
            const phraseRegex = new RegExp(
              `\\b${trackedPhrase.phrase}\\b`,
              'gi',
            );

            if (!post.content.match(phraseRegex)) {
              return Promise.resolve();
            }

            const user = await this.usersRepository.findByTelegramId(
              trackedPhrase.telegram_id,
            );

            if (!user) {
              return Promise.resolve();
            }

            if (user.username.toLowerCase() === post.author.toLowerCase()) {
              return Promise.resolve();
            }

            if (user.user_id === post.author_uid) {
              return Promise.resolve();
            }

            if (post.notified_to.includes(user.telegram_id)) {
              return Promise.resolve();
            }

            const foundIgnoredUser = ignoredUsers.find(
              ignoredUser => ignoredUser.username === post.author.toLowerCase(),
            );

            if (
              foundIgnoredUser &&
              foundIgnoredUser.ignoring.includes(user.telegram_id)
            ) {
              return Promise.resolve();
            }

            const postNotified = await this.cacheProvider.recover<boolean>(
              `notified:${post.post_id}:${user.telegram_id}`,
            );

            if (postNotified) {
              return Promise.resolve();
            }

            const trackedTopicUsers = await findTrackedTopicUsers.execute({
              telegram_id: user.telegram_id,
              topic_id: post.topic_id,
            });

            if (trackedTopicUsers.length) {
              const withlistedAuthor = trackedTopicUsers.findIndex(
                trackedTopicUser =>
                  trackedTopicUser.username === post.author.toLowerCase(),
              );

              if (withlistedAuthor === -1) {
                return Promise.resolve();
              }
            }

            await this.cacheProvider.save(
              `notified:${post.post_id}:${user.telegram_id}`,
              true,
              'EX',
              900,
            );

            return queue.add('sendPhraseTrackingNotification', {
              post,
              user,
              trackedPhrase,
            });
          }),
        );
      }),
    );

    await Promise.all(
      posts.map(async post => {
        await Promise.all(
          users.map(async user => {
            if (post.author.toLowerCase() === user.username.toLowerCase()) {
              return Promise.resolve();
            }

            const usernameRegex = new RegExp(`\\b${user.username}\\b`, 'gi');
            const altUsernameRegex = user.alternative_usernames.length
              ? new RegExp(`\\b${user.alternative_usernames[0]}\\b`, 'gi')
              : null;

            const regexBackupAtSign = new RegExp(`@${user.username}`, 'gi');
            const regexBackupQuoted = new RegExp(
              `Quote from: ${user.username} on`,
              'gi',
            );

            if (!post.content.match(usernameRegex)) {
              const foundAltUsername =
                altUsernameRegex && post.content.match(altUsernameRegex);

              const foundBackupRegex =
                post.content.match(regexBackupAtSign) ||
                post.content.match(regexBackupQuoted);

              if (!foundAltUsername && !foundBackupRegex) {
                return Promise.resolve();
              }
            }

            if (post.notified_to.includes(user.telegram_id)) {
              return Promise.resolve();
            }

            const foundIgnoredUser = ignoredUsers.find(
              ignoredUser => ignoredUser.username === post.author.toLowerCase(),
            );

            if (
              foundIgnoredUser &&
              foundIgnoredUser.ignoring.includes(user.telegram_id)
            ) {
              return Promise.resolve();
            }

            const foundIgnoredTopic = ignoredTopics.find(
              ignoredTopic => ignoredTopic.topic_id === post.topic_id,
            );

            if (
              foundIgnoredTopic &&
              foundIgnoredTopic.ignoring.includes(user.telegram_id)
            ) {
              return Promise.resolve();
            }

            const postNotified = await this.cacheProvider.recover<boolean>(
              `notified:${post.post_id}:${user.telegram_id}`,
            );

            if (postNotified) {
              return Promise.resolve();
            }

            await this.cacheProvider.save(
              `notified:${post.post_id}:${user.telegram_id}`,
              true,
              'EX',
              900,
            );

            return queue.add('sendMentionNotification', { post, user });
          }),
        );
      }),
    );

    await Promise.all(
      posts.map(async post => {
        await Promise.all(
          trackedTopics.map(async trackedTopic => {
            if (trackedTopic.topic_id !== post.topic_id) {
              return Promise.resolve();
            }

            return Promise.all(
              trackedTopic.tracking.map(async telegram_id => {
                const user = await this.usersRepository.findByTelegramId(
                  telegram_id,
                );

                if (!user) {
                  return Promise.resolve();
                }

                if (user.username.toLowerCase() === post.author.toLowerCase()) {
                  return Promise.resolve();
                }

                if (user.user_id === post.author_uid) {
                  return Promise.resolve();
                }

                if (post.notified_to.includes(user.telegram_id)) {
                  return Promise.resolve();
                }

                const foundIgnoredUser = ignoredUsers.find(
                  ignoredUser =>
                    ignoredUser.username === post.author.toLowerCase(),
                );

                if (
                  foundIgnoredUser &&
                  foundIgnoredUser.ignoring.includes(user.telegram_id)
                ) {
                  return Promise.resolve();
                }

                const postNotified = await this.cacheProvider.recover<boolean>(
                  `notified:${post.post_id}:${user.telegram_id}`,
                );

                if (postNotified) {
                  return Promise.resolve();
                }

                const trackedTopicUsers = await findTrackedTopicUsers.execute({
                  telegram_id: user.telegram_id,
                  topic_id: post.topic_id,
                });

                if (trackedTopicUsers.length) {
                  const withlistedAuthor = trackedTopicUsers.findIndex(
                    trackedTopicUser =>
                      trackedTopicUser.username === post.author.toLowerCase(),
                  );

                  if (withlistedAuthor === -1) {
                    return Promise.resolve();
                  }
                }

                await this.cacheProvider.save(
                  `notified:${post.post_id}:${user.telegram_id}`,
                  true,
                  'EX',
                  900,
                );

                return queue.add('sendTopicTrackingNotification', {
                  post,
                  user,
                });
              }),
            );
          }),
        );
      }),
    );

    await Promise.all(
      posts.map(async post => {
        await Promise.all(
          webUsers.map(async webUser => {
            if (post.author.toLowerCase() === webUser.username.toLowerCase()) {
              return Promise.resolve();
            }

            const usernameRegex = new RegExp(`\\b${webUser.username}\\b`, 'gi');

            if (!post.content.match(usernameRegex)) {
              return Promise.resolve();
            }

            return createWebNotification.execute({
              user_id: webUser.id,
              post_id: post.post_id,
            });
          }),
        );
      }),
    );

    await queue.close();
  }
}
