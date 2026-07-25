import type ModLog from '##/modules/modlog/infra/typeorm/entities/ModLog';
import type { RemoveTopicNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type TelegramBot from '##/apps/telegram/bot';

import SetModLogNotifiedService from '##/modules/modlog/services/SetModLogNotifiedService';
import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationRepository } from '##/modules/notifications/infra/typeorm/repositories/notification-repository';
import { buildRemovedTopicNotificationMessage } from '##/apps/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/apps/telegram/services/send-rich-telegram-message';
import logger from '##/platform/logging/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { inject, injectable } from 'tsyringe';

interface RemovedTopicNotificationData {
  bot: TelegramBot;
  telegramId: string;
  posts: Post[];
  modLog: ModLog;
}

@injectable()
export default class SendRemovedTopicNotificationService {
  constructor(
    @inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,

    @inject(SetModLogNotifiedService)
    private readonly setModLogNotified: SetModLogNotifiedService,
  ) {}

  private async markModLogAsNotified(modLog: ModLog, telegramId: string): Promise<void> {
    await this.setModLogNotified.execute(modLog, telegramId);
  }

  public async execute({
    bot,
    telegramId,
    modLog,
    posts,
  }: RemovedTopicNotificationData): Promise<boolean> {
    let message: string = '';

    try {
      message = buildRemovedTopicNotificationMessage(posts, modLog, telegramId);

      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info(
        { telegram_id: telegramId, topic_id: modLog.topic_id, message },
        'Removed Topic notification was sent',
      );
      await this.markModLogAsNotified(modLog, telegramId);
      await this.notificationRepository.createNotification<RemoveTopicNotification>({
        type: NotificationType.REMOVE_TOPIC,
        telegram_id: telegramId,
        metadata: {
          user_id: modLog.user_id,
          topic_id: modLog.topic_id,
          posts_removed_count: posts.length,
        },
      });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, { topic_id: modLog.topic_id, message });
      return false;
    }
  }
}
