import { container, inject, injectable } from 'tsyringe';
import cheerio from 'cheerio';
import escape from 'escape-html';

import { NotificationService } from '@/modules/posts/services/notification-service';
import {
  NotificationType,
  TrackedTopicNotification
} from '@/modules/notifications/infra/typeorm/entities/Notification';
import { sponsorText } from '../../../../../config/sponsor';
import logger from '../../../../services/logger';
import bot from '../../index';

import Post from '../../../../../modules/posts/infra/typeorm/entities/Post';

import SetPostNotifiedService from '../../../../../modules/posts/services/SetPostNotifiedService';
import { checkBotNotificationError } from '../../../../services/utils';
import ICacheProvider from '../../../../container/providers/models/ICacheProvider';

@injectable()
export default class SendTrackedTopicNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(telegramId: string, post: Post): Promise<boolean> {
    const setPostNotified = container.resolve(SetPostNotifiedService);
    const postLength = await this.getPostLength(telegramId);

    const { post_id, topic_id, title, author, boards, content } = post;
    const filteredContent = this.filterPostContent(content);
    const formattedTitle = this.formatTitle(boards, title);
    const message = this.buildMessage(author, topic_id, post_id, formattedTitle, filteredContent, postLength);

    try {
      await bot.instance.api.sendMessage(telegramId, message, { parse_mode: 'HTML' });
      logger.info({ telegramId, post_id, message }, 'Tracked Topic notification was sent');
      await setPostNotified.execute(post.post_id, telegramId);
      await this.createNotification(telegramId, { post_id });
      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, { post_id, message });
      return false;
    }
  }

  private async getPostLength(telegramId: string): Promise<number> {
    return (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;
  }

  private filterPostContent(content: string): string {
    const $ = cheerio.load(content);
    const data = $('body');
    data.children('div.quote, div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');
    return data.text().replace(/\s\s+/g, ' ').trim();
  }

  private formatTitle(boards: string[], title: string): string {
    return boards.length ? `${boards[boards.length - 1]} / ${title}` : title;
  }

  private buildMessage(
    author: string,
    topicId: number,
    postId: number,
    title: string,
    content: string,
    postLength: number
  ): string {
    const escapedAuthor = escape(author);
    const escapedTitle = escape(title);
    const truncatedContent = escape(content.substring(0, postLength)) + (content.length > postLength ? '...' : '');

    return (
      `📄 There is a new reply by <b>${escapedAuthor}</b> ` +
      `in the tracked topic <a href="https://bitcointalk.org/index.php?topic=${topicId}.msg${postId}#msg${postId}">` +
      `${escapedTitle}</a>\n` +
      `<pre>${truncatedContent}</pre>${sponsorText}`
    );
  }

  private async createNotification(telegramId: string, metadata: TrackedTopicNotification['metadata']) {
    const notificationService = new NotificationService();
    await notificationService.createNotification<TrackedTopicNotification>({
      type: NotificationType.TRACKED_TOPIC,
      telegram_id: telegramId,
      metadata
    });
  }
}
