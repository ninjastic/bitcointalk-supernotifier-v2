import type ModLog from '##/modules/modlog/infra/typeorm/entities/ModLog';
import type {
  SigBanNotification,
  SigBanRemovedNotification,
} from '##/modules/notifications/infra/typeorm/entities/Notification';
import type TelegramBot from '##/apps/telegram/bot';

import SetModLogNotifiedService from '##/modules/modlog/services/SetModLogNotifiedService';
import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationRepository } from '##/modules/notifications/infra/typeorm/repositories/notification-repository';
import {
  buildSigBanNotificationMessage,
  buildSigBanRemovedNotificationMessage,
} from '##/apps/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/apps/telegram/services/send-rich-telegram-message';
import logger from '##/platform/logging/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { inject, injectable } from 'tsyringe';

interface SigBanNotificationData {
  bot: TelegramBot;
  telegramId: string;
  modLog: ModLog;
}

@injectable()
export default class SendSigBanNotificationService {
  constructor(
    @inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,

    @inject(SetModLogNotifiedService)
    private readonly setModLogNotified: SetModLogNotifiedService,
  ) {}

  private async markModLogAsNotified(modLog: ModLog, telegramId: string): Promise<void> {
    await this.setModLogNotified.execute(modLog, telegramId);
  }

  public async execute({ bot, telegramId, modLog }: SigBanNotificationData): Promise<boolean> {
    let message: string = '';

    try {
      message =
        modLog.type === 'sig_ban_removed'
          ? buildSigBanRemovedNotificationMessage(telegramId)
          : buildSigBanNotificationMessage(modLog, telegramId);

      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info(
        { telegram_id: telegramId, user_id: modLog.user_id, message },
        'SigBan notification was sent',
      );
      await this.markModLogAsNotified(modLog, telegramId);

      if (modLog.type === 'sig_ban_removed') {
        await this.notificationRepository.createNotification<SigBanRemovedNotification>({
          type: NotificationType.SIG_BAN_REMOVED,
          telegram_id: telegramId,
          metadata: { user_id: modLog.user_id },
        });
      } else {
        await this.notificationRepository.createNotification<SigBanNotification>({
          type: NotificationType.SIG_BAN,
          telegram_id: telegramId,
          metadata: { user_id: modLog.user_id },
        });
      }

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
