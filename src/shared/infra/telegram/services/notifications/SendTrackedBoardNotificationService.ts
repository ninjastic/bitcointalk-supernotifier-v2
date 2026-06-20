import type { TrackedBoardNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type TrackedBoard from '##/modules/posts/infra/typeorm/entities/TrackedBoard';
import type ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import type TelegramBot from '##/shared/infra/telegram/bot';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import { buildTrackedBoardNotificationMessage } from '##/shared/infra/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/shared/infra/telegram/services/send-rich-telegram-message';
import logger from '##/shared/services/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { load } from 'cheerio';
import { container, inject, injectable } from 'tsyringe';

interface TrackedBoardNotificationData {
  bot: TelegramBot;
  telegramId: string;
  post: Post;
  trackedBoard: TrackedBoard;
}

@injectable()
export default class SendTrackedBoardNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  private filterPostContent(content: string): string {
    const $ = load(content);
    const data = $('body');
    data.children('div.quote, div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');
    return data
      .text()
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private async buildNotificationMessage(
    post: Post,
    trackedBoard: TrackedBoard,
    postLength: number,
    telegramId: string,
  ): Promise<string> {
    const { content } = post;
    const contentFiltered = this.filterPostContent(content);
    return buildTrackedBoardNotificationMessage(
      post,
      trackedBoard,
      contentFiltered,
      postLength,
      telegramId,
    );
  }

  private async createNotification(
    telegram_id: string,
    metadata: { post_id: number; board_id: number },
  ): Promise<void> {
    const notificationService = new NotificationService();
    await notificationService.createNotification<TrackedBoardNotification>({
      type: NotificationType.TRACKED_BOARD,
      telegram_id,
      metadata,
    });
  }

  public async execute({
    bot,
    telegramId,
    post,
    trackedBoard,
  }: TrackedBoardNotificationData): Promise<boolean> {
    const setPostNotified = container.resolve(SetPostNotifiedService);
    let message: string;

    try {
      const postLength =
        (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;
      const { post_id } = post;
      const { board } = trackedBoard;

      message = await this.buildNotificationMessage(post, trackedBoard, postLength, telegramId);

      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info(
        { telegram_id: telegramId, post_id, message },
        'Tracked Board notification was sent',
      );
      await setPostNotified.execute(post.post_id, telegramId);
      await this.createNotification(telegramId, { post_id, board_id: board.board_id });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, {
        post_id: post.post_id,
        trackedBoard,
        message,
      });
      return false;
    }
  }
}
