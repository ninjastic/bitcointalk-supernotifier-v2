import type { TrackedPhraseNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type ICacheProvider from '##/platform/cache/providers/models/ICacheProvider';
import type TelegramBot from '##/apps/telegram/bot';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationRepository } from '##/modules/notifications/infra/typeorm/repositories/notification-repository';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import { buildTrackedPhraseNotificationMessage } from '##/apps/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/apps/telegram/services/send-rich-telegram-message';
import logger from '##/platform/logging/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { inject, injectable } from 'tsyringe';

import { filterPostContent } from './filter-post-content';

interface TrackedPhraseNotificationData {
  bot: TelegramBot;
  telegramId: string;
  post: Post;
  phrase: string;
}

@injectable()
export default class SendTrackedPhraseNotificationService {
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
    phrase,
  }: TrackedPhraseNotificationData): Promise<boolean> {
    let message: string = '';

    try {
      const postLength =
        (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;

      message = buildTrackedPhraseNotificationMessage(
        post,
        phrase,
        filterPostContent(post.content),
        postLength,
        telegramId,
      );

      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info(
        { telegram_id: telegramId, post_id: post.post_id, message },
        'Tracked Phrase notification was sent',
      );
      await this.markPostAsNotified(post, telegramId);
      await this.notificationRepository.createNotification<TrackedPhraseNotification>({
        type: NotificationType.TRACKED_PHRASE,
        telegram_id: telegramId,
        metadata: {
          post_id: post.post_id,
          phrase,
        },
      });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, {
        post_id: post.post_id,
        phrase,
        message,
      });
      return false;
    }
  }
}
