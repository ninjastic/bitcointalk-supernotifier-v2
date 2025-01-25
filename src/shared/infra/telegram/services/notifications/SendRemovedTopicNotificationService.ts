import { container, injectable } from 'tsyringe';
import pluralize from 'pluralize';
import escape from 'escape-html';

import { sponsorText } from '@/config/sponsor';
import logger from '@/shared/services/logger';
import bot from '@/shared/infra/telegram';

import Post from '@/modules/posts/infra/typeorm/entities/Post';
import ModLog from '@/modules/modlog/infra/typeorm/entities/ModLog';

import { checkBotNotificationError } from '@/shared/services/utils';
import SetModLogNotifiedService from '@/modules/modlog/services/SetModLogNotifiedService';
import { NotificationService } from '@/modules/posts/services/notification-service';
import { NotificationType, RemoveTopicNotification } from '@/modules/notifications/infra/typeorm/entities/Notification';

type RemovedTopicNotificationData = {
  telegram_id: string;
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

  private async buildNotificationMessage(posts: Post[], modLog: ModLog): Promise<string> {
    const postCount = posts.length;
    const postPlural = pluralize('post', postCount);
    const possessivePronoun = postCount === 1 ? 'its' : 'their';

    return (
      `🗑️ You had <b>${postCount}</b> ${postPlural} deleted because ${possessivePronoun} parent topic got nuked.\n\n` +
      `<b>Archived Topic:</b> <a href="https://ninjastic.space/topic/${modLog.topic_id}">${escape(
        modLog.title
      )}</a>${sponsorText}`
    );
  }

  private async markModLogAsNotified(modLog: ModLog, telegramId: string): Promise<void> {
    const setModLogNotified = container.resolve(SetModLogNotifiedService);
    await setModLogNotified.execute(modLog, telegramId);
  }

  public async execute({ telegram_id, modLog, posts }: RemovedTopicNotificationData): Promise<boolean> {
    try {
      const message = await this.buildNotificationMessage(posts, modLog);

      await bot.instance.api.sendMessage(telegram_id, message, { parse_mode: 'HTML' });

      logger.info({ telegram_id, topic_id: modLog.topic_id, message }, 'Removed Topic notification was sent');

      await this.markModLogAsNotified(modLog, telegram_id);
      await this.createNotification(telegram_id, {
        user_id: modLog.user_id,
        topic_id: modLog.topic_id,
        posts_removed_count: posts.length
      });

      return true;
    } catch (error) {
      const message = await this.buildNotificationMessage(posts, modLog);
      await checkBotNotificationError(error, telegram_id, { topic_id: modLog.topic_id, message });
      return false;
    }
  }
}
