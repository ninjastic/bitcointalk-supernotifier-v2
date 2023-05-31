import logger from '../../../services/logger';
import bot from '../index';

import { checkBotNotificationError } from '../../../services/utils';

export default class SendApiNotificationService {
  public async execute(telegram_id: string, message: string): Promise<boolean> {
    return bot.instance.api
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info({ telegram_id, message }, 'API notification was sent');
        return true;
      })
      .catch(async error => {
        await checkBotNotificationError(error, telegram_id, { message });
        return false;
      });
  }
}
