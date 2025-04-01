import { container, inject, injectable } from 'tsyringe';
import { load } from 'cheerio';
import escape from 'escape-html';

import { NotificationService } from '##/modules/posts/services/notification-service';
import {
  NotificationType,
  TrackedTopicNotification
} from '##/modules/notifications/infra/typeorm/entities/Notification';
import TelegramBot from '##/shared/infra/telegram/bot';
import getSponsorPhrase from '##/shared/infra/telegram/services/get-sponsor-phrase';
import logger from '../../../../services/logger';

import Post from '../../../../../modules/posts/infra/typeorm/entities/Post';

import SetPostNotifiedService from '../../../../../modules/posts/services/SetPostNotifiedService';
import { checkBotNotificationError, isAprilFools } from '../../../../services/utils';
import ICacheProvider from '../../../../container/providers/models/ICacheProvider';
import { sarcasticAprilFoolsMessage } from '##/shared/services/ai';

type TrackedTopicNotificationData = {
  bot: TelegramBot;
  telegramId: string;
  post: Post;
};

@injectable()
export default class SendTrackedTopicNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  private async getPostLength(telegramId: string): Promise<number> {
    return (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;
  }

  private filterPostContent(content: string): string {
    const $ = load(content);
    const data = $('body');
    data.children('div.quote, div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');
    return data.text().replace(/\s\s+/g, ' ').trim();
  }

  private async createNotification(telegramId: string, metadata: TrackedTopicNotification['metadata']) {
    const notificationService = new NotificationService();
    await notificationService.createNotification<TrackedTopicNotification>({
      type: NotificationType.TRACKED_TOPIC,
      telegram_id: telegramId,
      metadata
    });
  }

  private async buildNotificationMessage(post: Post, postLength: number, telegramId: string): Promise<string> {
    const { author, title, content, post_id, topic_id } = post;

    const escapedAuthor = escape(author);
    const escapedTitle = escape(title);
    const contentFiltered = this.filterPostContent(content);
    const truncatedContent =
      escape(contentFiltered.substring(0, postLength)) + (contentFiltered.length > postLength ? '...' : '');
    const sponsor = getSponsorPhrase(telegramId);

    return (
      `📄 There is a new reply by <b>${escapedAuthor}</b> ` +
      `in the tracked topic <a href="https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}">` +
      `${escapedTitle}</a>\n` +
      `<pre>${truncatedContent}</pre>${sponsor}`
    );
  }

  private async buildNotificationMessageAprilFools(
    post: Post,
    postLength: number,
    telegramId: string
  ): Promise<string> {
    const { author, title, content, post_id, topic_id } = post;

    const escapedAuthor = escape(author);
    const escapedTitle = escape(title);
    const contentFiltered = this.filterPostContent(content);
    const truncatedContent =
      escape(contentFiltered.substring(0, postLength)) + (contentFiltered.length > postLength ? '...' : '');
    const sponsor = getSponsorPhrase(telegramId);

    const jokeMessage = await sarcasticAprilFoolsMessage(
      `📄 There is a new reply by <b>${escapedAuthor}</b> ` +
        `in the tracked topic <a href="https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}">` +
        `${escapedTitle}</a>\n` +
        contentFiltered
    );

    return (
      `📄 There is a new reply by <b>${escapedAuthor}</b> ` +
      `in the tracked topic <a href="https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}">` +
      `${escapedTitle}</a>\n\n` +
      `<a href="https://bitcointalk.org/index.php?topic=5248878.msg65230609#msg65230609">SuperNotifier Ninja-AI:</a> ${jokeMessage}` +
      sponsor
    );
  }

  public async execute({ bot, telegramId, post }: TrackedTopicNotificationData): Promise<boolean> {
    const setPostNotified = container.resolve(SetPostNotifiedService);

    let message: string;

    const { post_id } = post;
    const postLength = await this.getPostLength(telegramId);

    const aprilFools = isAprilFools();

    if (aprilFools) {
      message = await this.buildNotificationMessageAprilFools(post, postLength, telegramId);
    } else {
      message = await this.buildNotificationMessage(post, postLength, telegramId);
    }

    try {
      const messageSent = await bot.instance.api.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true }
      });

      if (messageSent) {
        logger.info({ telegram_id: telegramId, post_id, message, messageSent }, 'Tracked Topic notification was sent');
      } else {
        logger.warn({ telegram_id: telegramId, post_id, message }, 'Could not get Tracked Topic notification data');
      }

      await setPostNotified.execute(post.post_id, telegramId);
      await this.createNotification(telegramId, { post_id });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, { post_id, message });
      return false;
    }
  }
}
