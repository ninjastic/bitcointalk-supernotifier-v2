import type { TrackedUserNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import type TelegramBot from '##/shared/infra/telegram/bot';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import { buildTrackedUserNotificationMessage } from '##/shared/infra/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/shared/infra/telegram/services/send-rich-telegram-message';
import logger from '##/shared/services/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { load } from 'cheerio';
import { container, inject, injectable } from 'tsyringe';

interface TrackedUserNotificationData {
  bot: TelegramBot;
  telegramId: string;
  post: Post;
}

@injectable()
export default class SendTrackedUserNotificationService {
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
    metadata: TrackedUserNotification['metadata'],
  ) {
    const notificationService = new NotificationService();
    await notificationService.createNotification<TrackedUserNotification>({
      type: NotificationType.TRACKED_USER,
      telegram_id: telegramId,
      metadata,
    });
  }

  private async buildNotificationMessage(
    post: Post,
    postLength: number,
    telegramId: string,
  ): Promise<string> {
    const { content } = post;
    const contentFiltered = this.filterPostContent(content);
    return buildTrackedUserNotificationMessage(post, contentFiltered, postLength, telegramId);
  }

  public async execute({ bot, telegramId, post }: TrackedUserNotificationData): Promise<boolean> {
    let message: string;

    try {
      const postLength =
        (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;

      message = await this.buildNotificationMessage(post, postLength, telegramId);

      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info(
        { telegram_id: telegramId, post_id: post.post_id, message },
        'Tracked User notification was sent',
      );
      await this.markPostAsNotified(post, telegramId);
      await this.createNotification(telegramId, { post_id: post.post_id, author: post.author });

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
