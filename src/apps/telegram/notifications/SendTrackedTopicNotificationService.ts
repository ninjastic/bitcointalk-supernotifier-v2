import type { TrackedTopicNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type TelegramBot from '##/apps/telegram/bot';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationRepository } from '##/modules/notifications/infra/typeorm/repositories/notification-repository';
import { buildTrackedTopicNotificationMessage } from '##/apps/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/apps/telegram/services/send-rich-telegram-message';
import { inject, injectable } from 'tsyringe';

import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type ICacheProvider from '##/platform/cache/providers/models/ICacheProvider';

import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import logger from '##/platform/logging/logger';
import { checkBotNotificationError } from '##/shared/services/utils';

import { filterPostContent } from './filter-post-content';

interface TrackedTopicNotificationData {
  bot: TelegramBot;
  telegramId: string;
  post: Post;
}

@injectable()
export default class SendTrackedTopicNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,

    @inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,

    @inject(SetPostNotifiedService)
    private readonly setPostNotified: SetPostNotifiedService,
  ) {}

  private async getPostLength(telegramId: string): Promise<number> {
    return (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;
  }

  public async execute({ bot, telegramId, post }: TrackedTopicNotificationData): Promise<boolean> {
    const { post_id } = post;
    const postLength = await this.getPostLength(telegramId);

    const message = buildTrackedTopicNotificationMessage(
      post,
      filterPostContent(post.content),
      postLength,
      telegramId,
    );

    try {
      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info(
        { telegram_id: telegramId, post_id, message },
        'Tracked Topic notification was sent',
      );
      await this.setPostNotified.execute(post.post_id, telegramId);
      await this.notificationRepository.createNotification<TrackedTopicNotification>({
        type: NotificationType.TRACKED_TOPIC,
        telegram_id: telegramId,
        metadata: { post_id },
      });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, { post_id, message });
      return false;
    }
  }
}
