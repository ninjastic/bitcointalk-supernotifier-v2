import type { AdvancedMatchNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type AdvancedMatch from '##/modules/posts/infra/typeorm/entities/AdvancedMatch';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import type TelegramBot from '##/shared/infra/telegram/bot';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import { buildAdvancedMatchNotificationMessage } from '##/shared/infra/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/shared/infra/telegram/services/send-rich-telegram-message';
import logger from '##/shared/services/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { load } from 'cheerio';
import { container, inject, injectable } from 'tsyringe';

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
  ) {}

  private filterPostContent(content: string): string {
    const $ = load(content);
    const data = $('body');
    data.children('div.quote, div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');
    return data
      .text()
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private async markPostAsNotified(post: Post, telegramId: string): Promise<void> {
    const setPostNotified = container.resolve(SetPostNotifiedService);
    await setPostNotified.execute(post.post_id, telegramId);
  }

  private async createNotification(
    telegramId: string,
    metadata: AdvancedMatchNotification['metadata'],
  ) {
    const notificationService = new NotificationService();
    await notificationService.createNotification<AdvancedMatchNotification>({
      type: NotificationType.ADVANCED_MATCH,
      telegram_id: telegramId,
      metadata,
    });
  }

  public async execute({
    bot,
    telegramId,
    post,
    advancedMatch,
  }: AdvancedMatchNotificationData): Promise<boolean> {
    let message: string;

    try {
      const postLength =
        (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;
      const contentFiltered = this.filterPostContent(post.content);
      message = buildAdvancedMatchNotificationMessage(
        post,
        advancedMatch,
        contentFiltered,
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
      await this.createNotification(telegramId, {
        post_id: post.post_id,
        advanced_match_id: advancedMatch.id,
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
