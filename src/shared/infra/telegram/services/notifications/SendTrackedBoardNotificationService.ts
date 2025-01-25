import { container, inject, injectable } from 'tsyringe';
import cheerio from 'cheerio';
import escape from 'escape-html';

import { sponsorText } from '@/config/sponsor';
import logger from '@/shared/services/logger';
import bot from '@/shared/infra/telegram';

import Post from '@/modules/posts/infra/typeorm/entities/Post';
import TrackedBoard from '@/modules/posts/infra/typeorm/entities/TrackedBoard';

import { checkBotNotificationError } from '@/shared/services/utils';
import SetPostNotifiedService from '@/modules/posts/services/SetPostNotifiedService';
import ICacheProvider from '@/shared/container/providers/models/ICacheProvider';
import { NotificationService } from '@/modules/posts/services/notification-service';
import {
  NotificationType,
  TrackedBoardNotification
} from '@/modules/notifications/infra/typeorm/entities/Notification';

type TrackedBoardNotificationData = {
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

  private async getPostContentFiltered(content: string): Promise<string> {
    const $ = cheerio.load(content);
    const data = $('body');

    data.children('div.quote').remove();
    data.children('div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');

    return data.text().replace(/\s\s+/g, ' ').trim();
  }

  private async buildNotificationMessage(
    author: string,
    boardName: string,
    titleWithBoards: string,
    contentFiltered: string,
    postLength: number,
    topic_id: number,
    post_id: number
  ): Promise<string> {
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;

    return (
      `📝 There is a new topic by <b>${escape(author)}</b> ` +
      `in the tracked board <b>${boardName}</b>: ` +
      `<a href="${postUrl}">${escape(titleWithBoards)}</a>\n` +
      `<pre>${escape(contentFiltered.substring(0, postLength))}` +
      `${contentFiltered.length > postLength ? '...' : ''}</pre>${sponsorText}`
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

  public async execute({ telegramId, post, trackedBoard }: TrackedBoardNotificationData): Promise<boolean> {
    const setPostNotified = container.resolve(SetPostNotifiedService);

    try {
      const postLength = (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;
      const { post_id, topic_id, title, author, content } = post;
      const { board } = trackedBoard;

      const contentFiltered = await this.getPostContentFiltered(content);

      const message = await this.buildNotificationMessage(
        author,
        board.name,
        title,
        contentFiltered,
        postLength,
        topic_id,
        post_id
      );

      await bot.instance.api.sendMessage(telegramId, message, { parse_mode: 'HTML' });

      logger.info({ telegram_id: telegramId, post_id, message }, 'Tracked Board notification was sent');

      await setPostNotified.execute(post.post_id, telegramId);
      await this.createNotification(telegramId, { post_id, board_id: board.board_id });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, {
        post_id: post.post_id,
        trackedBoard,
        message: await this.buildNotificationMessage(
          post.author,
          trackedBoard.board.name,
          post.title,
          await this.getPostContentFiltered(post.content),
          150,
          post.topic_id,
          post.post_id
        )
      });
      return false;
    }
  }
}
