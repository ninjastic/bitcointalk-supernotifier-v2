import { container, inject, injectable } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import IUsersRepository from '../../users/repositories/IUsersRepository';
import IPostsHistoryRepository from '../repositories/IPostsHistoryRepository';
import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';

import SetPostHistoryCheckedService from './SetPostHistoryCheckedService';
import GetIgnoredUsersService from '../../users/services/GetIgnoredUsersService';
import GetIgnoredTopicsService from './GetIgnoredTopicsService';

@injectable()
export default class CheckPostsHistoryService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    @inject('PostsHistoryRepository')
    private postsHistoryRepository: IPostsHistoryRepository,

    @inject('CacheRepository')
    private cacheProvider: ICacheProvider,
  ) {}

  public async execute(): Promise<void> {
    const histories = await this.postsHistoryRepository.findLatestUncheckedPosts(
      50,
    );
    const users = await this.usersRepository.getUsersWithMentions();

    const getIgnoredUsers = container.resolve(GetIgnoredUsersService);
    const getIgnoredTopics = container.resolve(GetIgnoredTopicsService);

    const ignoredUsers = await getIgnoredUsers.execute();
    const ignoredTopics = await getIgnoredTopics.execute();

    const setPostHistoryChecked = container.resolve(
      SetPostHistoryCheckedService,
    );

    const queue = new Queue('TelegramQueue', {
      redis: cacheConfig.config.redis,
    });

    await Promise.all(
      histories.map(async history => {
        await Promise.all(
          users.map(async user => {
            if (!history.post) {
              return Promise.resolve();
            }

            if (
              history.post.author.toLowerCase() === user.username.toLowerCase()
            ) {
              return Promise.resolve();
            }

            const usernameRegex = new RegExp(`\\b${user.username}\\b`, 'gi');

            if (!history.content.match(usernameRegex)) {
              return Promise.resolve();
            }

            if (history.post.notified_to.includes(user.telegram_id)) {
              return Promise.resolve();
            }

            const foundIgnoredUser = ignoredUsers.find(
              ignoredUser =>
                ignoredUser.username === history.post.author.toLowerCase(),
            );

            if (
              foundIgnoredUser &&
              foundIgnoredUser.ignoring.includes(user.telegram_id)
            ) {
              return Promise.resolve();
            }

            const foundIgnoredTopic = ignoredTopics.find(
              ignoredTopic => ignoredTopic.topic_id === history.post.topic_id,
            );

            if (
              foundIgnoredTopic &&
              foundIgnoredTopic.ignoring.includes(user.telegram_id)
            ) {
              return Promise.resolve();
            }

            const postNotified = await this.cacheProvider.recover<boolean>(
              `notified:${history.post.post_id}:${user.telegram_id}`,
            );

            if (postNotified) {
              return Promise.resolve();
            }

            await this.cacheProvider.save(
              `notified:${history.post.post_id}:${user.telegram_id}`,
              true,
              'EX',
              180,
            );

            const postToNotify = {
              ...history.post,
              title: history.title,
              content: history.content,
            };

            return queue.add('sendMentionNotification', {
              post: postToNotify,
              user,
              history: true,
            });
          }),
        );

        return setPostHistoryChecked.execute(history.post.post_id, 1);
      }),
    );

    await queue.close();
  }
}