import type TelegramBot from '##/shared/infra/telegram/bot';

import sendRichTelegramMessage from '##/shared/infra/telegram/services/send-rich-telegram-message';
import logger from '##/shared/services/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { injectable } from 'tsyringe';

interface ApiNotificationData {
  bot: TelegramBot;
  telegramId: string;
  message: string;
}

@injectable()
export default class SendApiNotificationService {
  public async execute({ bot, telegramId, message }: ApiNotificationData): Promise<boolean> {
    try {
      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info({ telegramId, message }, 'API notification was sent');
      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, { message });
      return false;
    }
  }
}
