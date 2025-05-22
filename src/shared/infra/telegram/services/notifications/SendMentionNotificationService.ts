import { container, inject, injectable } from 'tsyringe';
import { load } from 'cheerio';
import escape from 'escape-html';

import logger from '##/shared/services/logger';
import TelegramBot from '##/shared/infra/telegram/bot';

import Post from '##/modules/posts/infra/typeorm/entities/Post';
import User from '##/modules/users/infra/typeorm/entities/User';

import { checkBotNotificationError, escapeUsername, isAprilFools } from '##/shared/services/utils';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import SetPostHistoryNotifiedService from '##/modules/posts/services/SetPostHistoryNotifiedService';
import ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import {
  NotificationType,
  PostMentionNotification
} from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import getSponsorPhrase from '##/shared/infra/telegram/services/get-sponsor-phrase';
import { sarcasticAprilFoolsMessage } from '##/shared/services/ai';
import { MentionType, RecipeMetadata } from '##/shared/infra/bull/types/telegram';

type MentionNotificationData = RecipeMetadata['sendMentionNotification'] & {
  bot: TelegramBot;
};

@injectable()
export default class SendMentionNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  private filterPostContent(content: string, user: User, mentionType: MentionType): string {
    const $ = load(content);
    const body = $('body');
    const relevantQuotesElements: cheerio.Element[] = [];
  
    body.find('img.userimg').each((_, element) => {
      $(element).replaceWith('[IMAGE]')
    })
  
    if (mentionType === 'quoted_mention') {
      const quotes = body.find('div.quoteheader:has(a:not(.ul)):not(.quote *)').toArray();
  
      quotes.forEach(element => {
        const quoteHeader = $(element);
  
        const isRegularQuote = quoteHeader.children('a:not(.ul)').length === 0;
        if (isRegularQuote) return;
  
        const authorMatch = quoteHeader.text().match(new RegExp(`Quote from: ${escapeUsername(user.username)} on`, 'gi'));
  
        if (authorMatch) {
          relevantQuotesElements.push(element);
        }
      });
  
      let relevantTexts = [];
  
      for (const quote of relevantQuotesElements) {
        let currentNode = quote.next;
        let isCurrentNodeDifferentQuote = false;
        while (currentNode && !isCurrentNodeDifferentQuote) {
          currentNode = currentNode.next;
          if (quotes.includes(currentNode)) break;
          if ($(currentNode).hasClass('quoteheader')) continue;
  
         const nodeText = $(currentNode).text()
         if (nodeText) {
          relevantTexts.push(nodeText)
         }
        }
      }
  
      if (relevantTexts.length) {
        return relevantTexts.join(' ');
      }
    }
  
    body.children('div.quote, div.quoteheader').remove();
    body.find('br').replaceWith('&nbsp;');
    return body.text().replace(/\s\s+/g, ' ').trim();
  }

  private async markPostAsNotified(post: Post, telegramId: string, history: boolean): Promise<void> {
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

  private async buildNotificationMessage(
    post: Post,
    postLength: number,
    user: User,
    mentionType: MentionType
  ): Promise<string> {
    const { topic_id, post_id, title, content, author } = post;
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;
    const contentFiltered = this.filterPostContent(content, user, mentionType);
    const sponsor = getSponsorPhrase(user.telegram_id);

    return (
      `💬 You have been mentioned by <b>${escape(author)}</b> ` +
      `in <a href="${postUrl}">${escape(title)}</a>\n` +
      `<pre>${escape(contentFiltered.substring(0, postLength))}` +
      `${contentFiltered.length > postLength ? '...' : ''}</pre>${sponsor}`
    );
  }

  private async buildNotificationMessageAprilFools(post: Post, user: User, mentionType: MentionType): Promise<string> {
    const { topic_id, post_id, title, content, author } = post;
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;
    const contentFiltered = this.filterPostContent(content, user, mentionType);
    const sponsor = getSponsorPhrase(user.telegram_id);

    const jokeMessage = await sarcasticAprilFoolsMessage(
      `💬 You have been mentioned by ${author} in ${title}: ${contentFiltered}`
    );

    return (
      `💬 You have been mentioned by <b>${escape(author)}</b> ` +
      `in <a href="${postUrl}">${escape(title)}</a>\n\n` +
      `<a href="https://bitcointalk.org/index.php?topic=5248878.msg65230609#msg65230609">SuperNotifier Ninja-AI:</a> ${jokeMessage}` +
      `${sponsor}`
    );
  }

  public async execute({ bot, post, user, history, mentionType }: MentionNotificationData): Promise<boolean> {
    let message: string;

    try {
      const postLength = (await this.cacheRepository.recover<number>(`${user.telegram_id}:postLength`)) ?? 150;

      const aprilFools = isAprilFools();

      if (aprilFools) {
        message = await this.buildNotificationMessageAprilFools(post, user, mentionType);
      } else {
        message = await this.buildNotificationMessage(post, postLength, user, mentionType);
      }

      const messageSent = await bot.instance.api.sendMessage(user.telegram_id, message, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true }
      });

      if (messageSent) {
        logger.info(
          { telegram_id: user.telegram_id, post_id: post.post_id, history, message, messageSent },
          'Mention notification was sent'
        );

        await this.markPostAsNotified(post, user.telegram_id, history);
        await this.createNotification(user.telegram_id, { post_id: post.post_id, history });
      } else {
        logger.info(
          { telegram_id: user.telegram_id, post_id: post.post_id, history, message },
          'Could not get Mention notification data'
        );
      }

      return true;
    } catch (error) {
      await checkBotNotificationError(error, user.telegram_id, {
        post_id: post.post_id,
        message,
        history
      });
      return false;
    }
  }
}
