import type {
  TrackedPhraseNotification,
} from '##/modules/notifications/infra/typeorm/entities/Notification';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import type TelegramBot from '##/shared/infra/telegram/bot';

import {
  NotificationType,
} from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import getSponsorPhrase from '##/shared/infra/telegram/services/get-sponsor-phrase';
import { sarcasticAprilFoolsMessage } from '##/shared/services/ai';
import logger from '##/shared/services/logger';
import { checkBotNotificationError, isAprilFools } from '##/shared/services/utils';
import { load } from 'cheerio';
import escape from 'escape-html';
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
    return data.text().replace(/\s{2,}/g, ' ').trim();
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
      metadata,
    });
  }

  private async buildNotificationMessage(
    post: Post,
    phrase: string,
    postLength: number,
    telegramId: string,
  ): Promise<string> {
    const { topic_id, post_id, title, author, content } = post;
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;
    const contentFiltered = this.filterPostContent(content);
    const sponsor = getSponsorPhrase(telegramId);

    return (
      `🔠 New post with matched phrase <b>${phrase}</b> `
      + `by <b>${escape(author)}</b> `
      + `in the topic <a href="${postUrl}">${escape(title)}</a>\n`
      + `<pre>${escape(contentFiltered.substring(0, postLength))}`
      + `${contentFiltered.length > postLength ? '...' : ''}</pre>${sponsor}`
    );
  }

  private async buildNotificationMessageAprilFools(
    post: Post,
    phrase: string,
    postLength: number,
    telegramId: string,
  ): Promise<string> {
    const { topic_id, post_id, title, author, content } = post;
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;
    const contentFiltered = this.filterPostContent(content);
    const sponsor = getSponsorPhrase(telegramId);

    const jokeMessage = await sarcasticAprilFoolsMessage(
      `🔠 New post with matched phrase <b>${phrase}</b> `
      + `by <b>${escape(author)}</b> `
      + `in the topic <a href="${postUrl}">${escape(title)}</a>\n${
        contentFiltered}`,
    );

    return (
      `🔠 New post with matched phrase <b>${phrase}</b> `
      + `by <b>${escape(author)}</b> `
      + `in the topic <a href="${postUrl}">${escape(title)}</a>\n\n`
      + `<a href="https://bitcointalk.org/index.php?topic=5248878.msg65230609#msg65230609">SuperNotifier Ninja-AI:</a> ${jokeMessage}${
        sponsor}`
    );
  }

  public async execute({ bot, telegramId, post, phrase }: TrackedPhraseNotificationData): Promise<boolean> {
    let message: string;

    try {
      const postLength = (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;

      const aprilFools = isAprilFools();

      if (aprilFools) {
        message = await this.buildNotificationMessageAprilFools(post, phrase, postLength, telegramId);
      }
      else {
        message = await this.buildNotificationMessage(post, phrase, postLength, telegramId);
      }

      const messageSent = await bot.instance.api.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });

      if (messageSent) {
        logger.info(
          { telegram_id: telegramId, post_id: post.post_id, message, messageSent },
          'Tracked Phrase notification was sent',
        );
        await this.markPostAsNotified(post, telegramId);
        await this.createNotification(telegramId, {
          post_id: post.post_id,
          phrase,
        });
      }
      else {
        logger.warn(
          { telegram_id: telegramId, post_id: post.post_id, message },
          'Could not get Tracked Phrase notification data',
        );
      }

      return true;
    }
    catch (error) {
      await checkBotNotificationError(error, telegramId, {
        post_id: post.post_id,
        phrase,
        message,
      });
      return false;
    }
  }
}
