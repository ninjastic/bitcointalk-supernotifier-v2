import PostVersion from '##/modules/posts/infra/typeorm/entities/PostVersion';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import { container, inject, injectable } from 'tsyringe';
import { getRepository } from 'typeorm';

import type IPostsRepository from '../../posts/repositories/IPostsRepository';
import type IUsersRepository from '../../users/repositories/IUsersRepository';
import type IModLogRepository from '../repositories/IModLogRepository';

import { addTelegramJob } from '../../../shared/infra/bull/queues/telegramQueue';
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
  ) {}

  public async execute(): Promise<void> {
    const postsVersionRepository = getRepository(PostVersion);
    const redisProvider = container.resolve(RedisProvider);

    const removedTopicModlogs = await this.modLogRepository.findUnchecked('remove_topic');
    const users = await this.usersRepository.getUsersWithModlogs();

    const setModLogChecked = container.resolve(SetModLogCheckedService);

    for await (const removedTopicModlog of removedTopicModlogs) {
      const topicPosts = await this.postsRepository.findPosts({ topic_id: removedTopicModlog.topic_id });

      for await (const user of users) {
        const postsDeleted = topicPosts.filter(topicPost => topicPost.author_uid === user.user_id);

        if (postsDeleted.length === 0) {
          continue;
        }

        await addTelegramJob('sendRemovedTopicNotification', {
          user,
          postsDeleted,
          modLog: removedTopicModlog,
        });
      }

      await setModLogChecked.execute(removedTopicModlog);
    }

    const deletedReplyModlogs = await this.modLogRepository.findUnchecked('delete_reply');

    for await (const deletedReplyModlog of deletedReplyModlogs) {
      const post = await this.postsRepository.findOneByPostId(deletedReplyModlog.post_id);

      if (!post) {
        await setModLogChecked.execute(deletedReplyModlog);
        continue;
      }

      const deletedPostVersionExists = await postsVersionRepository.findOne({ where: { post_id: post.post_id, deleted: true } });

      if (!deletedPostVersionExists) {
        const newDeletedPostVersion = postsVersionRepository.create({
          post_id: post.post_id,
          deleted: true,
        });

        await postsVersionRepository.save(newDeletedPostVersion);
        await redisProvider.invalidateByPrefix(`rescrapePost:${post.post_id}:*`);
      }

      await setModLogChecked.execute(deletedReplyModlog);
    }

    const nukedUserModlogs = await this.modLogRepository.findUnchecked('nuke_user');

    for await (const nukedUserModlog of nukedUserModlogs) {
      const userPosts = await this.postsRepository.findPosts({ author_uid: nukedUserModlog.user_id });

      if (!userPosts.length) {
        await setModLogChecked.execute(nukedUserModlog);
        continue;
      }

      for (const userPost of userPosts) {
        const deletedPostVersionExists = await postsVersionRepository.findOne({ where: { post_id: userPost.post_id, deleted: true } });

        if (!deletedPostVersionExists) {
          const newDeletedPostVersion = postsVersionRepository.create({
            post_id: userPost.post_id,
            deleted: true,
          });

          await postsVersionRepository.save(newDeletedPostVersion);
          await redisProvider.invalidateByPrefix(`rescrapePost:${userPost.post_id}:*`);
        }
      }

      await setModLogChecked.execute(nukedUserModlog);
    }
  }
}
