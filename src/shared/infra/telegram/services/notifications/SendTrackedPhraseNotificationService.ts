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
  TrackedPhraseNotification
} from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import getSponsorPhrase from '##/shared/infra/telegram/services/get-sponsor-phrase';

type TrackedPhraseNotificationData = {
  bot: TelegramBot;
  telegramId: string;
  post: Post;
  phrase: string;
};

@injectable()
export default class SendTrackedPhraseNotificationService {
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

  private async createNotification(telegramId: string, metadata: TrackedPhraseNotification['metadata']) {
    const notificationService = new NotificationService();
    await notificationService.createNotification<TrackedPhraseNotification>({
      type: NotificationType.TRACKED_PHRASE,
      telegram_id: telegramId,
      metadata
    });
  }

  private async buildNotificationMessage(
    post: Post,
    phrase: string,
    postLength: number,
    telegramId: string
  ): Promise<string> {
    const { topic_id, post_id, title, author, content } = post;
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;
    const contentFiltered = await this.getPostContentFiltered(content);
    const sponsor = getSponsorPhrase(telegramId);

    return (
      `🔠 New post with matched phrase <b>${phrase}</b> ` +
      `by <b>${escape(author)}</b> ` +
      `in the topic <a href="${postUrl}">${escape(title)}</a>\n` +
      `<pre>${escape(contentFiltered.substring(0, postLength))}` +
      `${contentFiltered.length > postLength ? '...' : ''}</pre>${sponsor}`
    );
  }

  public async execute({ bot, telegramId, post, phrase }: TrackedPhraseNotificationData): Promise<boolean> {
    let message: string;

    try {
      const postLength = (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;
      message = await this.buildNotificationMessage(post, phrase, postLength, telegramId);

      await bot.instance.api.sendMessage(telegramId, message, { parse_mode: 'HTML' });

      logger.info({ telegram_id: telegramId, post_id: post.post_id, message }, 'Tracked Phrase notification was sent');

      await this.markPostAsNotified(post, telegramId);
      await this.createNotification(telegramId, {
        post_id: post.post_id,
        phrase
      });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, {
        post_id: post.post_id,
        phrase,
        message
      });
      return false;
    }
  }
}
