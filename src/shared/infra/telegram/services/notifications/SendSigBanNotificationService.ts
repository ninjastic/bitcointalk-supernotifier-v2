import type ModLog from '##/modules/modlog/infra/typeorm/entities/ModLog';
import type { SigBanNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type TelegramBot from '##/shared/infra/telegram/bot';

import SetModLogNotifiedService from '##/modules/modlog/services/SetModLogNotifiedService';
import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import { buildSigBanNotificationMessage } from '##/shared/infra/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/shared/infra/telegram/services/send-rich-telegram-message';
import logger from '##/shared/services/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { container, injectable } from 'tsyringe';

interface SigBanNotificationData {
  bot: TelegramBot;
  telegramId: string;
  modLog: ModLog;
}

@injectable()
export default class SendSigBanNotificationService {
  private async createNotification(
    telegram_id: string,
    metadata: SigBanNotification['metadata'],
  ): Promise<void> {
    const notificationService = new NotificationService();
    await notificationService.createNotification<SigBanNotification>({
      type: NotificationType.SIG_BAN,
      telegram_id,
      metadata,
    });
  }

  private async buildNotificationMessage(modLog: ModLog, telegramId: string): Promise<string> {
    return buildSigBanNotificationMessage(modLog, telegramId);
  }

  private async markModLogAsNotified(modLog: ModLog, telegramId: string): Promise<void> {
    const setModLogNotified = container.resolve(SetModLogNotifiedService);
    await setModLogNotified.execute(modLog, telegramId);
  }

  public async execute({ bot, telegramId, modLog }: SigBanNotificationData): Promise<boolean> {
    let message: string = '';

    try {
      message = await this.buildNotificationMessage(modLog, telegramId);

      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info(
        { telegram_id: telegramId, user_id: modLog.user_id, message },
        'SigBan notification was sent',
      );
      await this.markModLogAsNotified(modLog, telegramId);
      await this.createNotification(telegramId, {
        user_id: modLog.user_id,
      });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, {
        user_id: modLog.user_id,
        message,
      });
      return false;
    }
  }
}
