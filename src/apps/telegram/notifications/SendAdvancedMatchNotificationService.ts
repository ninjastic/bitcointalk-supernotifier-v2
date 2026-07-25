import type { AdvancedMatchNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type AdvancedMatch from '##/modules/posts/infra/typeorm/entities/AdvancedMatch';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type ICacheProvider from '##/platform/cache/providers/models/ICacheProvider';
import type TelegramBot from '##/apps/telegram/bot';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationRepository } from '##/modules/notifications/infra/typeorm/repositories/notification-repository';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import { buildAdvancedMatchNotificationMessage } from '##/apps/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/apps/telegram/services/send-rich-telegram-message';
import logger from '##/platform/logging/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { inject, injectable } from 'tsyringe';

import { filterPostContent } from './filter-post-content';

interface AdvancedMatchNotificationData {
  bot: TelegramBot;
  telegramId: string;
  post: Post;
  advancedMatch: AdvancedMatch;
}

@injectable()
export default class SendAdvancedMatchNotificationService {
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
    advancedMatch,
  }: AdvancedMatchNotificationData): Promise<boolean> {
    let message: string = '';

    try {
      const postLength =
        (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;
      message = buildAdvancedMatchNotificationMessage(
        post,
        advancedMatch,
        filterPostContent(post.content),
        postLength,
        telegramId,
      );

      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info(
        {
          telegram_id: telegramId,
          post_id: post.post_id,
          advanced_match_id: advancedMatch.id,
          message,
        },
        'Advanced Match notification was sent',
      );
      await this.markPostAsNotified(post, telegramId);
      await this.notificationRepository.createNotification<AdvancedMatchNotification>({
        type: NotificationType.ADVANCED_MATCH,
        telegram_id: telegramId,
        metadata: {
          post_id: post.post_id,
          advanced_match_id: advancedMatch.id,
        },
      });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, {
        post_id: post.post_id,
        advanced_match_id: advancedMatch.id,
        message,
      });
      return false;
    }
  }
}
