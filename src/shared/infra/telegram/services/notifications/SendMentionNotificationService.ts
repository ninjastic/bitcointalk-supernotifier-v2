import { container, inject, injectable } from 'tsyringe';
import cheerio from 'cheerio';
import escape from 'escape-html';

import { sponsorText } from '@/config/sponsor';
import logger from '@/shared/services/logger';
import bot from '@/shared/infra/telegram';

import Post from '@/modules/posts/infra/typeorm/entities/Post';

import { checkBotNotificationError } from '@/shared/services/utils';
import SetPostNotifiedService from '@/modules/posts/services/SetPostNotifiedService';
import SetPostHistoryNotifiedService from '@/modules/posts/services/SetPostHistoryNotifiedService';
import ICacheProvider from '@/shared/container/providers/models/ICacheProvider';
import { NotificationType, PostMentionNotification } from '@/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '@/modules/posts/services/notification-service';

type MentionNotificationData = {
  post: Post;
  telegramId: string;
  history: boolean;
};

@injectable()
export default class SendMentionNotificationService {
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

  private async markPostAsNotified(post: Post, telegramId, history: boolean): Promise<void> {
    const setPostNotified = container.resolve(SetPostNotifiedService);
    const setPostHistoryNotified = container.resolve(SetPostHistoryNotifiedService);

    if (history) {
      await setPostHistoryNotified.execute(post.post_id, telegramId);
    } else {
      await setPostNotified.execute(post.post_id, telegramId);
    }
  }

  private async createNotification(telegramId: string, metadata: PostMentionNotification['metadata']) {
    const notificationService = new NotificationService();
    await notificationService.createNotification<PostMentionNotification>({
      type: NotificationType.POST_MENTION,
      telegram_id: telegramId,
      metadata
    });
  }

  private async buildNotificationMessage(post: Post, postLength: number): Promise<string> {
    const { topic_id, post_id, title, author } = post;
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;
    const contentFiltered = await this.getPostContentFiltered(post.content);

    return (
      `💬 You have been mentioned by <b>${escape(author)}</b> ` +
      `in <a href="${postUrl}">${escape(title)}</a>\n` +
      `<pre>${escape(contentFiltered.substring(0, postLength))}` +
      `${contentFiltered.length > postLength ? '...' : ''}</pre>${sponsorText}`
    );
  }

  public async execute({ post, telegramId, history }: MentionNotificationData): Promise<boolean> {
    try {
      const postLength = (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;
      const message = await this.buildNotificationMessage(post, postLength);

      const messageSent = await bot.instance.api.sendMessage(telegramId, message, { parse_mode: 'HTML' });

      if (messageSent) {
        logger.info(
          { telegram_id: telegramId, post_id: post.post_id, history, message, messageSent },
          'Mention notification was sent'
        );
      } else {
        logger.info(
          { telegram_id: telegramId, post_id: post.post_id, history, message },
          'Could not get mention notification data'
        );
      }

      await this.markPostAsNotified(post, telegramId, history);
      await this.createNotification(telegramId, { post_id: post.post_id, history });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, {
        post_id: post.post_id,
        message: await this.buildNotificationMessage(post, 150),
        history
      });
      return false;
    }
  }
}
