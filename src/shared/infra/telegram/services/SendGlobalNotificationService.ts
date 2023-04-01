import { injectable, inject, container } from 'tsyringe';

import logger from '../../../services/logger';
import bot from '../index';

import IUsersRepository from '../../../../modules/users/repositories/IUsersRepository';

import SetUserBlockedService from './SetUserBlockedService';
import RedisProvider from '../../../container/providers/implementations/RedisProvider';

type MessageSent = {
  telegramId: string;
  messageId: number;
};

@injectable()
export default class SendGlobalNotificationService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  public async execute(message: string): Promise<void> {
    const setUserBlocked = container.resolve(SetUserBlockedService);
    const redisProvider = container.resolve(RedisProvider);

    const unblockedUsers = await this.usersRepository.findAll(true);
    const messageIds: MessageSent[] = [];
    let successed = 0;
    let errored = 0;

    await bot.instance.api.sendMessage(608520255, `Starting to send the messages...`);

    const promises = unblockedUsers.map(
      async (user, index) =>
        new Promise<void>((resolve, reject) => {
          setTimeout(async () => {
            await bot.instance.api
              .sendMessage(user.telegram_id, message, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                  remove_keyboard: true
                }
              })
              .then(messageSent => {
                logger.info({ telegram_id: user.telegram_id, message }, 'Global notification was sent');
                messageIds.push({
                  telegramId: String(messageSent.chat.id),
                  messageId: messageSent.message_id
                });
                successed += 1;
                resolve();
              })
              .catch(async error => {
                errored += 1;
                if (!error.response) {
                  logger.error(
                    { error: error.message, telegram_id: user.telegram_id, message },
                    'Error while sending Global Notification telegram message'
                  );
                } else if (
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
                reject();
              });
          }, 150 * index);
        })
    );

    await Promise.allSettled(promises);

    const id = Math.floor(new Date().getTime() * Math.random()).toString();
    await redisProvider.save(`globalNotificationMessages:${id}`, messageIds, 'EX', 300);

    await bot.instance.api.sendMessage(
      608520255,
      `The messages were sent!\n\nID: ${id}\n\n<b>${successed}/${unblockedUsers.length} successed (${errored} failed)</b>`,
      { parse_mode: 'HTML' }
    );
  }
}
