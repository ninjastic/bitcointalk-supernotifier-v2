import { container, injectable } from 'tsyringe';
import logger from '##/shared/services/logger';
import TelegramBot from '##/shared/infra/telegram/bot';
import { checkBotNotificationError } from '##/shared/services/utils';

type ApiNotificationData = {
  telegramId: string;
  message: string;
};

@injectable()
export default class SendApiNotificationService {
  public async execute({ telegramId, message }: ApiNotificationData): Promise<boolean> {
    try {
      const bot = container.resolve(TelegramBot);
      await bot.instance.api.sendMessage(telegramId, message, { parse_mode: 'HTML' });

      logger.info({ telegramId, message }, 'API notification was sent');
      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, { message });
      return false;
    }
  }
}
