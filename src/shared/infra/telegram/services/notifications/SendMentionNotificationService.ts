import type { PostMentionNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type User from '##/modules/users/infra/typeorm/entities/User';
import type ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import type { MentionType, RecipeMetadata } from '##/shared/infra/bull/types/telegram';
import type TelegramBot from '##/shared/infra/telegram/bot';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import SetPostHistoryNotifiedService from '##/modules/posts/services/SetPostHistoryNotifiedService';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import { buildMentionNotificationMessage } from '##/shared/infra/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/shared/infra/telegram/services/send-rich-telegram-message';
import logger from '##/shared/services/logger';
import { checkBotNotificationError, escapeUsername } from '##/shared/services/utils';
import { load } from 'cheerio';
import { container, inject, injectable } from 'tsyringe';

type MentionNotificationData = RecipeMetadata['sendMentionNotification'] & {
  bot: TelegramBot;
};

@injectable()
export default class SendMentionNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  private filterPostContent(content: string, user: User, mentionType: MentionType): string {
    const $ = load(content);
    const body = $('body');
    const relevantQuotesElements: cheerio.Element[] = [];

    body.find('img.userimg').each((_, element) => {
      $(element).replaceWith('[IMAGE]');
    });

    if (mentionType === 'quoted_mention') {
      const quotes = body.find('div.quoteheader:has(a:not(.ul)):not(.quote *)').toArray();

      quotes.forEach((element) => {
        const quoteHeader = $(element);

        const isRegularQuote = quoteHeader.children('a:not(.ul)').length === 0;
        if (isRegularQuote) return;

        const authorMatch = quoteHeader
          .text()
          .match(new RegExp(`Quote from: ${escapeUsername(user.username)} on`, 'gi'));

        if (authorMatch) {
          relevantQuotesElements.push(element);
        }
      });

      const relevantTexts = [];

      for (const quote of relevantQuotesElements) {
        let currentNode = quote.next;
        while (currentNode) {
          currentNode = currentNode.next;
          if (quotes.includes(currentNode)) break;
          if ($(currentNode).hasClass('quoteheader')) continue;

          const nodeText = $(currentNode).text();
          if (nodeText) {
            relevantTexts.push(nodeText);
          }
        }
      }

      if (relevantTexts.length) {
        return relevantTexts.join(' ');
      }
    }

    body.children('div.quote, div.quoteheader').remove();
    body.find('br').replaceWith('&nbsp;');
    return body
      .text()
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private async markPostAsNotified(
    post: Post,
    telegramId: string,
    history: boolean,
  ): Promise<void> {
    const setPostNotified = container.resolve(SetPostNotifiedService);
    const setPostHistoryNotified = container.resolve(SetPostHistoryNotifiedService);

    if (history) {
      await setPostHistoryNotified.execute(post.post_id, telegramId);
    } else {
      await setPostNotified.execute(post.post_id, telegramId);
    }
  }

  private async createNotification(
    telegramId: string,
    metadata: PostMentionNotification['metadata'],
  ) {
    const notificationService = new NotificationService();
    await notificationService.createNotification<PostMentionNotification>({
      type: NotificationType.POST_MENTION,
      telegram_id: telegramId,
      metadata,
    });
  }

  private async buildNotificationMessage(
    post: Post,
    postLength: number,
    user: User,
    mentionType: MentionType,
  ): Promise<string> {
    const { content } = post;
    const contentFiltered = this.filterPostContent(content, user, mentionType);
    return buildMentionNotificationMessage(post, contentFiltered, postLength, user.telegram_id);
  }

  public async execute({
    bot,
    post,
    user,
    history,
    mentionType,
  }: MentionNotificationData): Promise<boolean> {
    let message: string;

    try {
      const postLength =
        (await this.cacheRepository.recover<number>(`${user.telegram_id}:postLength`)) ?? 150;

      message = await this.buildNotificationMessage(post, postLength, user, mentionType);

      await sendRichTelegramMessage(bot, user.telegram_id, message);

      logger.info(
        { telegram_id: user.telegram_id, post_id: post.post_id, history, message },
        'Mention notification was sent',
      );

      await this.markPostAsNotified(post, user.telegram_id, history);
      await this.createNotification(user.telegram_id, { post_id: post.post_id, history });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, user.telegram_id, {
        post_id: post.post_id,
        message,
        history,
      });
      return false;
    }
  }
}
