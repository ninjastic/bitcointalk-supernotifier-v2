import type ModLog from '##/modules/modlog/infra/typeorm/entities/ModLog';
import type { RemoveTopicNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type TelegramBot from '##/shared/infra/telegram/bot';

import SetModLogNotifiedService from '##/modules/modlog/services/SetModLogNotifiedService';
import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import { buildRemovedTopicNotificationMessage } from '##/shared/infra/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/shared/infra/telegram/services/send-rich-telegram-message';
import logger from '##/shared/services/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { container, injectable } from 'tsyringe';

interface RemovedTopicNotificationData {
  bot: TelegramBot;
  telegramId: string;
  posts: Post[];
  modLog: ModLog;
}

@injectable()
export default class SendRemovedTopicNotificationService {
  private async createNotification(
    telegram_id: string,
    metadata: RemoveTopicNotification['metadata'],
  ): Promise<void> {
    const notificationService = new NotificationService();
    await notificationService.createNotification<RemoveTopicNotification>({
      type: NotificationType.REMOVE_TOPIC,
      telegram_id,
      metadata,
    });
  }

  private async buildNotificationMessage(
    posts: Post[],
    modLog: ModLog,
    telegramId: string,
  ): Promise<string> {
    return buildRemovedTopicNotificationMessage(posts, modLog, telegramId);
  }

  private async markModLogAsNotified(modLog: ModLog, telegramId: string): Promise<void> {
    const setModLogNotified = container.resolve(SetModLogNotifiedService);
    await setModLogNotified.execute(modLog, telegramId);
  }

  public async execute({
    bot,
    telegramId,
    modLog,
    posts,
  }: RemovedTopicNotificationData): Promise<boolean> {
    let message: string;

    try {
      message = await this.buildNotificationMessage(posts, modLog, telegramId);

      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info(
        { telegram_id: telegramId, topic_id: modLog.topic_id, message },
        'Removed Topic notification was sent',
      );
      await this.markModLogAsNotified(modLog, telegramId);
      await this.createNotification(telegramId, {
        user_id: modLog.user_id,
        topic_id: modLog.topic_id,
        posts_removed_count: posts.length,
      });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, { topic_id: modLog.topic_id, message });
      return false;
    }
  }
}
