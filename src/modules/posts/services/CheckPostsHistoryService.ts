import { getRepository } from 'typeorm';
import { container, inject, injectable } from 'tsyringe';

import Notification, { NotificationType } from '../../notifications/infra/typeorm/entities/Notification';
import { addTelegramJob } from '../../../shared/infra/bull/queues/telegramQueue';

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
    private cacheProvider: ICacheProvider
  ) {}

  public async execute(): Promise<void> {
    const histories = await this.postsHistoryRepository.findLatestUncheckedPosts();
    const users = await this.usersRepository.getUsersWithMentions();

    const getIgnoredUsers = container.resolve(GetIgnoredUsersService);
    const getIgnoredTopics = container.resolve(GetIgnoredTopicsService);

    const ignoredUsers = await getIgnoredUsers.execute();
    const ignoredTopics = await getIgnoredTopics.execute();

    const setPostHistoryChecked = container.resolve(SetPostHistoryCheckedService);

    await Promise.all(
      histories.map(async history => {
        await Promise.all(
          users.map(async user => {
            if (!history.post) {
              return Promise.resolve();
            }

            if (history.post.author.toLowerCase() === user.username.toLowerCase()) {
              return Promise.resolve();
            }

            const usernameRegex = new RegExp(`\\b${user.username}\\b`, 'gi');
            const altUsernameRegex = user.alternative_usernames.length
              ? new RegExp(`\\b${user.alternative_usernames[0]}\\b`, 'gi')
              : null;

            if (!history.content.match(usernameRegex)) {
              if (!altUsernameRegex) {
                return Promise.resolve();
              }

              if (!history.content.match(altUsernameRegex)) {
                return Promise.resolve();
              }
            }

            if (history.post.notified_to.includes(user.telegram_id) || history.notified_to.includes(user.telegram_id)) {
              return Promise.resolve();
            }

            const foundIgnoredUser = ignoredUsers.find(
              ignoredUser => ignoredUser.username === history.post.author.toLowerCase()
            );

            if (foundIgnoredUser && foundIgnoredUser.ignoring.includes(user.telegram_id)) {
              return Promise.resolve();
            }

            const foundIgnoredTopic = ignoredTopics.find(
              ignoredTopic => ignoredTopic.topic_id === history.post.topic_id
            );

            if (foundIgnoredTopic && foundIgnoredTopic.ignoring.includes(user.telegram_id)) {
              return Promise.resolve();
            }

            const postNotified =
              (await this.cacheProvider.recover<boolean>(`notified:${history.post_id}:${user.telegram_id}`)) ||
              (await getRepository(Notification)
                .createQueryBuilder('notification')
                .where('notification.type = :type', { type: NotificationType.POST_MENTION })
                .andWhere('notification.telegram_id = :telegramId', { telegramId: user.telegram_id })
                .andWhere(`notification.metadata->>'post_id' = :postId`, { postId: history.post_id })
                .getOne());

            if (postNotified) {
              return Promise.resolve();
            }

            await this.cacheProvider.save(`notified:${history.post_id}:${user.telegram_id}`, true, 'EX', 900);

            const postToNotify = {
              ...history.post,
              title: history.title,
              content: history.content
            };

            return addTelegramJob('sendMentionNotification', {
              post: postToNotify,
              user,
              history: true
            });
          })
        );

        return setPostHistoryChecked.execute(history.post.post_id, 1);
      })
    );
  }
}
