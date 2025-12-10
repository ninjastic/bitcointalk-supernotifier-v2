import type TelegramBot from '##/shared/infra/telegram/bot';

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
      await bot.instance.api.sendMessage(telegramId, message, { parse_mode: 'HTML' });

      logger.info({ telegramId, message }, 'API notification was sent');
      return true;
    }
    catch (error) {
      await checkBotNotificationError(error, telegramId, { message });
      return false;
    }
  }
}
