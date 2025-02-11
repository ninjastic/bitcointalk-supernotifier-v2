import { container, inject, injectable } from 'tsyringe';

import { isUserMentionedInPost, shouldNotifyUser } from '##/shared/services/utils';
import { NotificationService } from '##/modules/posts/services/notification-service';
import ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import logger from '##/shared/services/logger';
import { RecipeMetadata } from '##/shared/infra/bull/types/telegram';
import { NotificationType } from '../../notifications/infra/typeorm/entities/Notification';
import { addTelegramJob } from '../../../shared/infra/bull/queues/telegramQueue';

import IUsersRepository from '../../users/repositories/IUsersRepository';
import IPostsHistoryRepository from '../repositories/IPostsHistoryRepository';

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
    private cacheRepository: ICacheProvider,

    @inject('NotificationService')
    private notificationService: NotificationService
  ) {}

  private async shouldProcessNotification(
    metadata: RecipeMetadata['sendMentionNotification'],
    notificationKey: string
  ): Promise<boolean> {
    const { post, user } = metadata;

    const isJobAlreadyInQueue = await this.cacheRepository.recover(notificationKey);
    if (isJobAlreadyInQueue) return false;

    const redisAnswer = await this.cacheRepository.save(notificationKey, true, 'EX', 1800);
    if (redisAnswer !== 'OK') {
      logger.error({ notificationKey, redisAnswer }, 'CheckPostsHistoryService Job lock did not return OK');
      return false;
    }

    const notificationExists = await this.notificationService.findOne({
      type: NotificationType.POST_MENTION,
      telegram_id: user.telegram_id,
      metadata: { post_id: post.id }
    });

    return !notificationExists;
  }

  public async execute(): Promise<void> {
    const histories = await this.postsHistoryRepository.findLatestUncheckedPosts();
    const users = await this.usersRepository.getUsersWithMentions();

    const getIgnoredUsers = container.resolve(GetIgnoredUsersService);
    const getIgnoredTopics = container.resolve(GetIgnoredTopicsService);

    const ignoredUsers = await getIgnoredUsers.execute();
    const ignoredTopics = await getIgnoredTopics.execute();

    const setPostHistoryChecked = container.resolve(SetPostHistoryCheckedService);

    for await (const history of histories) {
      for await (const user of users) {
        if (!history.post) continue;
        if (!isUserMentionedInPost(history.post, user)) continue;
        if (!shouldNotifyUser(history.post, user, ignoredUsers, ignoredTopics)) continue;

        const notificationKey = `CheckPostsHistoryService:${user.telegram_id}:${history.post.post_id}`;

        const post = {
          ...history.post,
          title: history.title,
          content: history.content
        };

        const notificationMetadata = {
          post,
          user,
          history: true
        };

        const shouldNotify = this.shouldProcessNotification(notificationMetadata, notificationKey);
        if (!shouldNotify) continue;

        await addTelegramJob('sendMentionNotification', notificationMetadata);
      }
      await setPostHistoryChecked.execute(history.post.post_id, 1);
    }
  }
}
