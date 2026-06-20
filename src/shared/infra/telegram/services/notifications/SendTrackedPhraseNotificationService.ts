import type { TrackedPhraseNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import type TelegramBot from '##/shared/infra/telegram/bot';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import { buildTrackedPhraseNotificationMessage } from '##/shared/infra/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/shared/infra/telegram/services/send-rich-telegram-message';
import logger from '##/shared/services/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { load } from 'cheerio';
import { container, inject, injectable } from 'tsyringe';

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
    metadata: TrackedPhraseNotification['metadata'],
  ) {
    const notificationService = new NotificationService();
    await notificationService.createNotification<TrackedPhraseNotification>({
      type: NotificationType.TRACKED_PHRASE,
      telegram_id: telegramId,
      metadata,
    });
  }

  private async buildNotificationMessage(
    post: Post,
    phrase: string,
    postLength: number,
    telegramId: string,
  ): Promise<string> {
    const { content } = post;
    const contentFiltered = this.filterPostContent(content);
    return buildTrackedPhraseNotificationMessage(
      post,
      phrase,
      contentFiltered,
      postLength,
      telegramId,
    );
  }

  public async execute({
    bot,
    telegramId,
    post,
    phrase,
  }: TrackedPhraseNotificationData): Promise<boolean> {
    let message: string;

    try {
      const postLength =
        (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;

      message = await this.buildNotificationMessage(post, phrase, postLength, telegramId);

      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info(
        { telegram_id: telegramId, post_id: post.post_id, message },
        'Tracked Phrase notification was sent',
      );
      await this.markPostAsNotified(post, telegramId);
      await this.createNotification(telegramId, {
        post_id: post.post_id,
        phrase,
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
