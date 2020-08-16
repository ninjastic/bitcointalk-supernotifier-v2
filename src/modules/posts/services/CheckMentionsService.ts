import { container, inject, injectable } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import IPostsRepository from '../repositories/IPostsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';

import SetPostCheckedService from './SetPostCheckedService';

@injectable()
export default class CheckMentionsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
  ) {}

  public async execute(): Promise<void> {
    const posts = await this.postsRepository.getLatestUncheckedPosts(20);
    const users = await this.usersRepository.getUsersWithMentions();

    const setPostChecked = container.resolve(SetPostCheckedService);

    const queue = new Queue('telegramNotifications', {
      redis: cacheConfig.config.redis,
    });

    Promise.all(
      posts.map(async post => {
        Promise.all(
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
  }
}
