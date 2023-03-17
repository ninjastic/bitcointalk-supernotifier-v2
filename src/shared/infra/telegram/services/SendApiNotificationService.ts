import { container } from 'tsyringe';

import logger from '../../../services/logger';
import bot from '../index';

import SetUserBlockedService from './SetUserBlockedService';

export default class SendApiNotificationService {
  public async execute(telegram_id: string, message: string): Promise<void> {
    const setUserBlocked = container.resolve(SetUserBlockedService);

    await bot.instance.api
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info({ telegram_id, message }, 'API notification was sent');
      })
      .catch(async error => {
        const isBotBlocked = ['Forbidden: bot was blocked by the user', 'Forbidden: user is deactivated'].includes(
          error.response?.description
        );
        if (isBotBlocked) {
          logger.info({ telegram_id, message }, 'Telegram user marked as blocked');
          await setUserBlocked.execute(telegram_id);
        } else {
          logger.error(
            { error: error.response ?? error.message, telegram_id, message },
            'Error while sending API Notification telegram message'
          );
        }
      });
  }
}
