import { container, inject, injectable } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import IPostsRepository from '../repositories/IPostsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';
import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';

import SetPostCheckedService from './SetPostCheckedService';
import GetTrackedTopicsService from './GetTrackedTopicsService';
import GetIgnoredUsersService from '../../users/services/GetIgnoredUsersService';
import GetIgnoredTopicsService from './GetIgnoredTopicsService';

@injectable()
export default class CheckPostsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    @inject('CacheRepository')
    private cacheProvider: ICacheProvider,
  ) {}

  public async execute(): Promise<void> {
    const posts = await this.postsRepository.findLatestUncheckedPosts(20);
    const users = await this.usersRepository.getUsersWithMentions();

    const getTrackedTopics = container.resolve(GetTrackedTopicsService);
    const getIgnoredUsers = container.resolve(GetIgnoredUsersService);
    const getIgnoredTopics = container.resolve(GetIgnoredTopicsService);

    const trackedTopics = await getTrackedTopics.execute();
    const ignoredUsers = await getIgnoredUsers.execute();
    const ignoredTopics = await getIgnoredTopics.execute();

    const setPostChecked = container.resolve(SetPostCheckedService);

    const queue = new Queue('TelegramQueue', {
      redis: cacheConfig.config.redis,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
    });

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

                await this.cacheProvider.save(
                  `notified:${post.post_id}:${user.telegram_id}`,
                  true,
                  'EX',
                  180,
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
          users.map(async user => {
            if (post.author.toLowerCase() === user.username.toLowerCase()) {
              return Promise.resolve();
            }

            const usernameRegex = new RegExp(`\\b${user.username}\\b`, 'gi');
            const altUsernameRegex = user.alternative_usernames.length
              ? new RegExp(`\\b${user.alternative_usernames[0]}\\b`, 'gi')
              : null;

            if (!post.content.match(usernameRegex)) {
              if (!altUsernameRegex) {
                return Promise.resolve();
              }

              if (!post.content.match(altUsernameRegex)) {
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
              180,
            );

            return queue.add('sendMentionNotification', { post, user });
          }),
        );

        return setPostChecked.execute(post.post_id);
      }),
    );

    await queue.close();
  }
}
