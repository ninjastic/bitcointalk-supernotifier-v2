import { container, inject, injectable } from 'tsyringe';
import { load } from 'cheerio';
import escape from 'escape-html';

import logger from '##/shared/services/logger';
import TelegramBot from '##/shared/infra/telegram/bot';

import Post from '##/modules/posts/infra/typeorm/entities/Post';

import { checkBotNotificationError, isAprilFools } from '##/shared/services/utils';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import {
  NotificationType,
  TrackedUserNotification
} from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import getSponsorPhrase from '##/shared/infra/telegram/services/get-sponsor-phrase';
import { sarcasticAprilFoolsMessage } from '##/shared/services/ai';

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

  private filterPostContent(content: string): string {
    const $ = load(content);
    const data = $('body');
    data.children('div.quote, div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');
    return data.text().replace(/\s\s+/g, ' ').trim();
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
    const contentFiltered = this.filterPostContent(content);
    const sponsor = getSponsorPhrase(telegramId);

    return (
      `👤 There is a new post by the tracked user <b>${escape(author)}</b>: ` +
      `<a href="${postUrl}">${escape(title)}</a>\n` +
      `<pre>${escape(contentFiltered.substring(0, postLength))}` +
      `${contentFiltered.length > postLength ? '...' : ''}</pre>${sponsor}`
    );
  }

  private async buildNotificationMessageAprilFools(
    post: Post,
    postLength: number,
    telegramId: string
  ): Promise<string> {
    const { topic_id, post_id, title, author, content } = post;
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;
    const contentFiltered = this.filterPostContent(content);
    const sponsor = getSponsorPhrase(telegramId);

    const jokeMessage = await sarcasticAprilFoolsMessage(
      `👤 There is a new post by the tracked user <b>${escape(author)}</b>: ` +
        `<a href="${postUrl}">${escape(title)}</a>\n` +
        contentFiltered
    );

    return (
      `👤 There is a new post by the tracked user <b>${escape(author)}</b>: ` +
      `<a href="${postUrl}">${escape(title)}</a>\n\n` +
      `<a href="https://bitcointalk.org/index.php?topic=5248878.msg65230609#msg65230609">SuperNotifier Ninja-AI:</a> ${jokeMessage}` +
      sponsor
    );
  }

  public async execute({ bot, telegramId, post }: TrackedUserNotificationData): Promise<boolean> {
    let message: string;

    try {
      const postLength = (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;

      const aprilFools = isAprilFools();

      if (aprilFools) {
        message = await this.buildNotificationMessageAprilFools(post, postLength, telegramId);
      } else {
        message = await this.buildNotificationMessage(post, postLength, telegramId);
      }

      const messageSent = await bot.instance.api.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true }
      });

      if (messageSent) {
        logger.info(
          { telegram_id: telegramId, post_id: post.post_id, message, messageSent },
          'Tracked User notification was sent'
        );
      } else {
        logger.warn(
          { telegram_id: telegramId, post_id: post.post_id, message },
          'Could not get Tracked User notification data'
        );
      }

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
