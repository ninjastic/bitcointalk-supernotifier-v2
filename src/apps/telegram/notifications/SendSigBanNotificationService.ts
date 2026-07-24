import type ModLog from '##/modules/modlog/infra/typeorm/entities/ModLog';
import type {
  SigBanNotification,
  SigBanRemovedNotification,
} from '##/modules/notifications/infra/typeorm/entities/Notification';
import type TelegramBot from '##/apps/telegram/bot';

import SetModLogNotifiedService from '##/modules/modlog/services/SetModLogNotifiedService';
import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import {
  buildSigBanNotificationMessage,
  buildSigBanRemovedNotificationMessage,
} from '##/apps/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/apps/telegram/services/send-rich-telegram-message';
import logger from '##/platform/logging/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { container, injectable } from 'tsyringe';

interface SigBanNotificationData {
  bot: TelegramBot;
  telegramId: string;
  modLog: ModLog;
}

@injectable()
export default class SendSigBanNotificationService {
  private async createNotification(telegram_id: string, modLog: ModLog): Promise<void> {
    const notificationService = new NotificationService();

    if (modLog.type === 'sig_ban_removed') {
      await notificationService.createNotification<SigBanRemovedNotification>({
        type: NotificationType.SIG_BAN_REMOVED,
        telegram_id,
        metadata: { user_id: modLog.user_id },
      });
      return;
    }

    await notificationService.createNotification<SigBanNotification>({
      type: NotificationType.SIG_BAN,
      telegram_id,
      metadata: { user_id: modLog.user_id },
    });
  }

  private async buildNotificationMessage(modLog: ModLog, telegramId: string): Promise<string> {
    return modLog.type === 'sig_ban_removed'
      ? buildSigBanRemovedNotificationMessage(telegramId)
      : buildSigBanNotificationMessage(modLog, telegramId);
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
      await this.createNotification(telegramId, modLog);

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
