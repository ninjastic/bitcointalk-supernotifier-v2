import { injectable, inject, container } from 'tsyringe';
import escape from 'escape-html';

import logger from '../../../services/logger';
import bot from '../index';

import IUsersRepository from '../../../../modules/users/repositories/IUsersRepository';

import SetUserBlockedService from './SetUserBlockedService';

@injectable()
export default class SendGlobalNotificationService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  public async execute(message: string): Promise<void> {
    const setUserBlocked = container.resolve(SetUserBlockedService);

    const users = await this.usersRepository.findAll(true);

    let successed = 0;
    let errored = 0;

    await Promise.all(
      users.map(async (user, index, array) => {
        setTimeout(async () => {
          await bot.instance.api
            .sendMessage(user.telegram_id, escape(message), {
              parse_mode: 'HTML',
              reply_markup: {
                remove_keyboard: true
              }
            })
            .then(() => {
              logger.info({ telegram_id: user.telegram_id, message }, 'Global notification was sent');
              successed += 1;
            })
            .catch(async error => {
              if (!error.response) {
                logger.error(
                  { error: error.message, telegram_id: user.telegram_id, message },
                  'Error while sending Global Notification telegram message'
                );

                return;
              }
              if (
                error.response.description === 'Forbidden: bot was blocked by the user' ||
                error.response.description === 'Forbidden: user is deactivated'
              ) {
                logger.info(
                  {
                    error: error.response,
                    telegram_id: user.telegram_id,
                    message
                  },
                  'Telegram user marked as blocked'
                );
                await setUserBlocked.execute(user.telegram_id);
              } else {
                logger.error(
                  {
                    error: error.response,
                    telegram_id: user.telegram_id,
                    message
                  },
                  'Error while sending Global Notification telegram message'
                );
              }

              errored += 1;
            });

          if (index === array.length - 1) {
            await bot.instance.api.sendMessage(
              608520255,
              `The messages were sent!\n\nSuccessed: ${successed}\nErrored: ${errored}`,
              { parse_mode: 'HTML' }
            );
          }
        }, 150 * index);
      })
    );
  }
}
