import { injectable, inject, container } from 'tsyringe';

import logger from '##/shared/services/logger';
import bot from '##/shared/infra/telegram';
import { ADMIN_TELEGRAM_ID } from '##/config/admin';

import IUsersRepository from '##/modules/users/repositories/IUsersRepository';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';

import { checkBotNotificationError } from '##/shared/services/utils';

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

  private async sendMessageToUser(userTelegramId: string, message: string): Promise<MessageSent> {
    const messageSent = await bot.instance.api.sendMessage(userTelegramId, message, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      reply_markup: { remove_keyboard: true }
    });

    logger.info({ telegram_id: userTelegramId, message }, 'Global notification was sent');
    return { telegramId: String(messageSent.chat.id), messageId: messageSent.message_id };
  }

  private async saveMessageIdsToRedis(messageIds: MessageSent[]): Promise<string> {
    const redisProvider = container.resolve(RedisProvider);
    const id = Math.floor(new Date().getTime() * Math.random()).toString();
    await redisProvider.save(`globalNotificationMessages:${id}`, messageIds, 'EX', 300);
    return id;
  }

  private async sendStatusMessage(successed: number, errored: number, totalUsers: number, id: string): Promise<void> {
    await bot.instance.api.sendMessage(
      608520255,
      `The messages were sent!\n\nID: ${id}\n\n<b>${successed}/${totalUsers} successed (${errored} failed)</b>`,
      { parse_mode: 'HTML' }
    );
  }

  public async execute(message: string): Promise<boolean> {
    const unblockedUsers = await this.usersRepository.findAll(true);
    const messageIds: MessageSent[] = [];
    let successed = 0;
    let errored = 0;

    await bot.instance.api.sendMessage(ADMIN_TELEGRAM_ID, `Starting to send the messages...`);

    const promises = unblockedUsers.map(
      async (user, index) =>
        new Promise<void>(resolve => {
          setTimeout(async () => {
            try {
              const messageSent = await this.sendMessageToUser(user.telegram_id, message);
              messageIds.push(messageSent);
              successed += 1;
            } catch (error) {
              errored += 1;
              await checkBotNotificationError(error, user.telegram_id, { message });
            } finally {
              resolve();
            }
          }, 150 * index);
        })
    );

    await Promise.allSettled(promises);

    const id = await this.saveMessageIdsToRedis(messageIds);
    await this.sendStatusMessage(successed, errored, unblockedUsers.length, id);

    return true;
  }
}
