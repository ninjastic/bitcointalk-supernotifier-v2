import { container, inject, injectable } from 'tsyringe';

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
    const modLogs = await this.modLogRepository.findUnchecked('remove_topic');
    const users = await this.usersRepository.getUsersWithModlogs();

    const setModLogChecked = container.resolve(SetModLogCheckedService);

    for await (const modLog of modLogs) {
      const topicPosts = await this.postsRepository.findPosts({ topic_id: modLog.topic_id });

      for await (const user of users) {
        const postsDeleted = topicPosts.filter(topicPost => topicPost.author_uid === user.user_id);

        if (postsDeleted.length === 0) {
          continue;
        }

        await addTelegramJob('sendRemovedTopicNotification', {
          user,
          postsDeleted,
          modLog,
        });

        await setModLogChecked.execute(modLog);
      }
    }
  }
}
