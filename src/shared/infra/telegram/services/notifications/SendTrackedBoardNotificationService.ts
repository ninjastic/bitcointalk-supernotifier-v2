import { container, inject, injectable } from 'tsyringe';
import cheerio from 'cheerio';
import escape from 'escape-html';

import logger from '##/shared/services/logger';
import TelegramBot from '##/shared/infra/telegram/bot';

import Post from '##/modules/posts/infra/typeorm/entities/Post';
import TrackedBoard from '##/modules/posts/infra/typeorm/entities/TrackedBoard';

import { checkBotNotificationError } from '##/shared/services/utils';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import { NotificationService } from '##/modules/posts/services/notification-service';
import {
  NotificationType,
  TrackedBoardNotification
} from '##/modules/notifications/infra/typeorm/entities/Notification';
import getSponsorPhrase from '##/shared/infra/telegram/services/get-sponsor-phrase';

type TrackedBoardNotificationData = {
  bot: TelegramBot;
  telegramId: string;
  post: Post;
  trackedBoard: TrackedBoard;
};

@injectable()
export default class SendTrackedBoardNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  private filterPostContent(content: string): string {
    const $ = cheerio.load(content);
    const data = $('body');
    data.children('div.quote, div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');
    return data.text().replace(/\s\s+/g, ' ').trim();
  }

  private async buildNotificationMessage(
    post: Post,
    trackedBoard: TrackedBoard,
    postLength: number,
    telegramId: string
  ): Promise<string> {
    const { author, title, content, topic_id, post_id } = post;
    const { board } = trackedBoard;
    const contentFiltered = this.filterPostContent(content);

    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;
    const sponsor = getSponsorPhrase(telegramId);

    return (
      `📝 There is a new topic by <b>${escape(author)}</b> ` +
      `in the tracked board <b>${board.name}</b>: ` +
      `<a href="${postUrl}">${escape(title)}</a>\n` +
      `<pre>${escape(contentFiltered.substring(0, postLength))}` +
      `${contentFiltered.length > postLength ? '...' : ''}</pre>${sponsor}`
    );
  }

  private async createNotification(
    telegram_id: string,
    metadata: { post_id: number; board_id: number }
  ): Promise<void> {
    const notificationService = new NotificationService();
    await notificationService.createNotification<TrackedBoardNotification>({
      type: NotificationType.TRACKED_BOARD,
      telegram_id,
      metadata
    });
  }

  public async execute({ bot, telegramId, post, trackedBoard }: TrackedBoardNotificationData): Promise<boolean> {
    const setPostNotified = container.resolve(SetPostNotifiedService);
    let message: string;

    try {
      const postLength = (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;
      const { post_id } = post;
      const { board } = trackedBoard;

      message = await this.buildNotificationMessage(post, trackedBoard, postLength, telegramId);

      const messageSent = await bot.instance.api.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true }
      });

      if (messageSent) {
        logger.info({ telegram_id: telegramId, post_id, message, messageSent }, 'Tracked Board notification was sent');
      } else {
        logger.warn({ telegram_id: telegramId, post_id, message }, 'Could not get Tracked Board notification data');
      }

      await setPostNotified.execute(post.post_id, telegramId);
      await this.createNotification(telegramId, { post_id, board_id: board.board_id });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, {
        post_id: post.post_id,
        trackedBoard,
        message
      });
      return false;
    }
  }
}
