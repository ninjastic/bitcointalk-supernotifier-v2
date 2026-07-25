import type { TrackedBoardNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type TrackedBoard from '##/modules/posts/infra/typeorm/entities/TrackedBoard';
import type ICacheProvider from '##/platform/cache/providers/models/ICacheProvider';
import type TelegramBot from '##/apps/telegram/bot';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationRepository } from '##/modules/notifications/infra/typeorm/repositories/notification-repository';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import { buildTrackedBoardNotificationMessage } from '##/apps/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/apps/telegram/services/send-rich-telegram-message';
import logger from '##/platform/logging/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { inject, injectable } from 'tsyringe';

import { filterPostContent } from './filter-post-content';

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

    @inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,

    @inject(SetPostNotifiedService)
    private readonly setPostNotified: SetPostNotifiedService,
  ) {}

  public async execute({
    bot,
    telegramId,
    post,
    trackedBoard,
  }: TrackedBoardNotificationData): Promise<boolean> {
    let message: string = '';

    try {
      const postLength =
        (await this.cacheRepository.recover<number>(`${telegramId}:postLength`)) ?? 150;
      const { post_id } = post;
      const { board } = trackedBoard;

      message = buildTrackedBoardNotificationMessage(
        post,
        trackedBoard,
        filterPostContent(post.content),
        postLength,
        telegramId,
      );

      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info(
        { telegram_id: telegramId, post_id, message },
        'Tracked Board notification was sent',
      );
      await this.setPostNotified.execute(post.post_id, telegramId);
      await this.notificationRepository.createNotification<TrackedBoardNotification>({
        type: NotificationType.TRACKED_BOARD,
        telegram_id: telegramId,
        metadata: { post_id, board_id: board.board_id },
      });

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
