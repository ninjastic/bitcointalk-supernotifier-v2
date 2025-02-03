import { container, injectable } from 'tsyringe';
import pluralize from 'pluralize';
import escape from 'escape-html';

import logger from '##/shared/services/logger';
import TelegramBot from '##/shared/infra/telegram/bot';

import Post from '##/modules/posts/infra/typeorm/entities/Post';
import ModLog from '##/modules/modlog/infra/typeorm/entities/ModLog';

import { checkBotNotificationError } from '##/shared/services/utils';
import SetModLogNotifiedService from '##/modules/modlog/services/SetModLogNotifiedService';
import { NotificationService } from '##/modules/posts/services/notification-service';
import {
  NotificationType,
  RemoveTopicNotification
} from '##/modules/notifications/infra/typeorm/entities/Notification';
import getSponsorPhrase from '##/shared/infra/telegram/services/get-sponsor-phrase';

type RemovedTopicNotificationData = {
  bot: TelegramBot;
  telegramId: string;
  posts: Post[];
  modLog: ModLog;
};

@injectable()
export default class SendRemovedTopicNotificationService {
  private async createNotification(telegram_id: string, metadata: RemoveTopicNotification['metadata']): Promise<void> {
    const notificationService = new NotificationService();
    await notificationService.createNotification<RemoveTopicNotification>({
      type: NotificationType.REMOVE_TOPIC,
      telegram_id,
      metadata
    });
  }

  private async buildNotificationMessage(posts: Post[], modLog: ModLog, telegramId: string): Promise<string> {
    const postCount = posts.length;
    const postPlural = pluralize('post', postCount);
    const possessivePronoun = postCount === 1 ? 'its' : 'their';
    const sponsor = getSponsorPhrase(telegramId);

    return (
      `🗑️ You had <b>${postCount}</b> ${postPlural} deleted because ${possessivePronoun} parent topic got nuked.\n\n` +
      `<b>Archived Topic:</b> <a href="https://ninjastic.space/topic/${modLog.topic_id}">${escape(
        modLog.title
      )}</a>${sponsor}`
    );
  }

  private async markModLogAsNotified(modLog: ModLog, telegramId: string): Promise<void> {
    const setModLogNotified = container.resolve(SetModLogNotifiedService);
    await setModLogNotified.execute(modLog, telegramId);
  }

  public async execute({ bot, telegramId, modLog, posts }: RemovedTopicNotificationData): Promise<boolean> {
    let message: string;

    try {
      message = await this.buildNotificationMessage(posts, modLog, telegramId);

      const messageSent = await bot.instance.api.sendMessage(telegramId, message, { parse_mode: 'HTML' });

      if (messageSent) {
        logger.info(
          { telegram_id: telegramId, topic_id: modLog.topic_id, message, messageSent },
          'Removed Topic notification was sent'
        );
      } else {
        logger.warn(
          { telegram_id: telegramId, topic_id: modLog.topic_id, message },
          'Could not get Removed Topic notification data'
        );
      }

      await this.markModLogAsNotified(modLog, telegramId);
      await this.createNotification(telegramId, {
        user_id: modLog.user_id,
        topic_id: modLog.topic_id,
        posts_removed_count: posts.length
      });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, { topic_id: modLog.topic_id, message });
      return false;
    }
  }
}
