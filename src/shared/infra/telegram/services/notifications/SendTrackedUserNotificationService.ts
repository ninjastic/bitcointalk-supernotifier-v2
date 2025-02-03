import { container, inject, injectable } from 'tsyringe';
import cheerio from 'cheerio';
import escape from 'escape-html';

import logger from '##/shared/services/logger';
import TelegramBot from '##/shared/infra/telegram/bot';

import Post from '##/modules/posts/infra/typeorm/entities/Post';

import { checkBotNotificationError } from '##/shared/services/utils';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import {
  NotificationType,
  TrackedUserNotification
} from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import getSponsorPhrase from '##/shared/infra/telegram/services/get-sponsor-phrase';

type TrackedUserNotificationData = {
  bot: TelegramBot;
  telegramId: string;
  post: Post;
};

@injectable()
export default class SendTrackedUserNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  private async getPostContentFiltered(content: string): Promise<string> {
    const $ = cheerio.load(content);
    const html = $('body');

    html.children('div.quote').remove();
    html.children('div.quoteheader').remove();
    html.find('br').replaceWith('&nbsp;');

    return html.text().replace(/\s\s+/g, ' ').trim();
  }

  private async markPostAsNotified(post: Post, telegramId: string): Promise<void> {
    const setPostNotified = container.resolve(SetPostNotifiedService);
    await setPostNotified.execute(post.post_id, telegramId);
  }

  private async createNotification(telegramId: string, metadata: TrackedUserNotification['metadata']) {
    const notificationService = new NotificationService();
    await notificationService.createNotification<TrackedUserNotification>({
      type: NotificationType.TRACKED_USER,
      telegram_id: telegramId,
      metadata
    });
  }

  private async buildNotificationMessage(post: Post, postLength: number, telegramId: string): Promise<string> {
    const { topic_id, post_id, title, author, content } = post;
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;
    const contentFiltered = await this.getPostContentFiltered(content);
    const sponsor = getSponsorPhrase(telegramId);

    return (
      `👤 There is a new post by the tracked user <b>${escape(author)}</b>: ` +
      `<a href="${postUrl}">${escape(title)}</a>\n` +
      `<pre>${escape(contentFiltered.substring(0, postLength))}` +
      `${contentFiltered.length > postLength ? '...' : ''}</pre>${sponsor}`
    );
  }

  public async execute({ bot, telegramId, post }: TrackedUserNotificationData): Promise<boolean> {
    let message: string;

    try {
      const postLength = (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;
      message = await this.buildNotificationMessage(post, postLength, telegramId);

      await bot.instance.api.sendMessage(telegramId, message, { parse_mode: 'HTML' });

      logger.info({ telegram_id: telegramId, post_id: post.post_id, message }, 'Tracked User notification was sent');

      await this.markPostAsNotified(post, telegramId);
      await this.createNotification(telegramId, { post_id: post.post_id, author: post.author });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, {
        post_id: post.post_id,
        message
      });
      return false;
    }
  }
}
