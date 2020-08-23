import { container, inject, injectable } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import IPostsRepository from '../../posts/repositories/IPostsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';
import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IModLogRepository from '../repositories/IModLogRepository';

import Post from '../../posts/infra/typeorm/entities/Post';

import SetModLogCheckedService from './SetModLogCheckedService';

@injectable()
export default class CheckModLogsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('ModLogRepository')
    private modLogRepository: IModLogRepository,

    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    @inject('CacheRepository')
    private cacheProvider: ICacheProvider,
  ) {}

  public async execute(): Promise<void> {
    const modLogs = await this.modLogRepository.findUnchecked('remove_topic');
    const users = await this.usersRepository.getUsersWithMentions();

    const setModLogChecked = container.resolve(SetModLogCheckedService);

    const queue = new Queue('TelegramQueue', {
      redis: cacheConfig.config.redis,
    });

    await Promise.all(
      modLogs.map(async modLog => {
        const topicPosts = await this.postsRepository.findPostsFromTopicId(
          modLog.topic_id,
        );

        await Promise.all(
          users.map(async user => {
            const postsDeleted = [] as Post[];

            topicPosts.forEach(topicPost => {
              if (topicPost.author_uid !== user.user_id) {
                return;
              }

              postsDeleted.push(topicPost);
            });

            if (postsDeleted.length === 0) {
              return Promise.resolve();
            }

            return queue.add('sendRemovedTopicNotification', {
              user,
              postsDeleted,
              modLog,
            });
          }),
        );

        await setModLogChecked.execute(modLog);
      }),
    );

    await queue.close();
  }
}