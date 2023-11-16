import { container, inject, injectable } from 'tsyringe';

import { addTelegramJob } from '../../../shared/infra/bull/queues/telegramQueue';

import IUsersRepository from '../../users/repositories/IUsersRepository';
import IPostsHistoryRepository from '../repositories/IPostsHistoryRepository';
import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import NotificationRepository from '../../notifications/infra/typeorm/repositories/NotificationRepository';

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
    const notificationRepository = new NotificationRepository();

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

            const notificationData = {
              telegram_id: user.telegram_id,
              type: 'post_mention',
              metadata: { post_id: history.post.post_id }
            };

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
              (await notificationRepository.findOne({ where: notificationData }));

            if (postNotified) {
              return Promise.resolve();
            }

            await this.cacheProvider.save(`notified:${history.post_id}:${user.telegram_id}`, true, 'EX', 900);

            const postToNotify = {
              ...history.post,
              title: history.title,
              content: history.content
            };

            const notification = notificationRepository.create(notificationData);
            await notificationRepository.save(notification);

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
