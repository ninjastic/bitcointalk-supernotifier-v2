import { container, inject, injectable } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import IPostsRepository from '../repositories/IPostsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';
import ITrackedsTopicsRepository from '../repositories/ITrackedTopicsRepository';

import SetPostCheckedService from './SetPostCheckedService';

@injectable()
export default class CheckPostsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    @inject('TrackedTopicsRepository')
    private trackedTopicsRepository: ITrackedsTopicsRepository,
  ) {}

  public async execute(): Promise<void> {
    const posts = await this.postsRepository.getLatestUncheckedPosts(20);
    const users = await this.usersRepository.getUsersWithMentions();
    const trackedTopics = await this.trackedTopicsRepository.findAllWithUsers();

    const setPostChecked = container.resolve(SetPostCheckedService);

    const queue = new Queue('TelegramQueue', {
      redis: cacheConfig.config.redis,
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

            if (!post.content.match(usernameRegex)) {
              return Promise.resolve();
            }

            if (post.notified_to.includes(user.telegram_id)) {
              return Promise.resolve();
            }

            return queue.add('sendMentionNotification', { post, user });
          }),
        );

        return setPostChecked.execute(post.post_id);
      }),
    );

    await queue.close();
  }
}
