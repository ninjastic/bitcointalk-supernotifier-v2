import type { TrackedUserNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type ICacheProvider from '##/platform/cache/providers/models/ICacheProvider';
import type TelegramBot from '##/apps/telegram/bot';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationRepository } from '##/modules/notifications/infra/typeorm/repositories/notification-repository';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import { buildTrackedUserNotificationMessage } from '##/apps/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/apps/telegram/services/send-rich-telegram-message';
import logger from '##/platform/logging/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { inject, injectable } from 'tsyringe';

import { filterPostContent } from './filter-post-content';

interface TrackedUserNotificationData {
  bot: TelegramBot;
  telegramId: string;
  post: Post;
  isTopic: boolean;
}

@injectable()
export default class SendTrackedUserNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,

    @inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,

    @inject(SetPostNotifiedService)
    private readonly setPostNotified: SetPostNotifiedService,
  ) {}

  private async markPostAsNotified(post: Post, telegramId: string): Promise<void> {
    await this.setPostNotified.execute(post.post_id, telegramId);
  }

  public async execute({
    bot,
    telegramId,
    post,
    isTopic,
  }: TrackedUserNotificationData): Promise<boolean> {
    let message: string = '';

    try {
      const postLength =
        (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;

      message = buildTrackedUserNotificationMessage(
        post,
        filterPostContent(post.content),
        postLength,
        telegramId,
        isTopic,
      );

      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info(
        { telegram_id: telegramId, post_id: post.post_id, message },
        'Tracked User notification was sent',
      );
      await this.markPostAsNotified(post, telegramId);
      await this.notificationRepository.createNotification<TrackedUserNotification>({
        type: NotificationType.TRACKED_USER,
        telegram_id: telegramId,
        metadata: { post_id: post.post_id, author: post.author },
      });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, {
        post_id: post.post_id,
        message,
      });
      return false;
    }
  }
}
