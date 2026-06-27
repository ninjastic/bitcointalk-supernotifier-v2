import type IUsersRepository from '##/modules/users/repositories/IUsersRepository';
import type RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import type TelegramBot from '##/shared/infra/telegram/bot';

import { ADMIN_TELEGRAM_ID } from '##/config/admin';
import logger from '##/shared/services/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { randomUUID } from 'node:crypto';
import { container, inject, injectable } from 'tsyringe';

interface MessageSent {
  telegramId: string;
  messageId: number;
}

interface GlobalNotificationResult {
  id: string;
  total: number;
  succeeded: number;
  failed: number;
}

const SEND_DELAY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

@injectable()
export default class SendGlobalNotificationService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    @inject('TelegramBot')
    private bot: TelegramBot,
  ) {}

  private async sendMessageToUser(userTelegramId: string, message: string): Promise<MessageSent> {
    const messageSent = await this.bot.instance.api.sendMessage(userTelegramId, message, {
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
    });

    logger.info({ telegram_id: userTelegramId, message }, 'Global notification was sent');
    return { telegramId: String(messageSent.chat.id), messageId: messageSent.message_id };
  }

  private async saveMessageIdsToRedis(messageIds: MessageSent[]): Promise<string> {
    const redisProvider = container.resolve<RedisProvider>('CacheRepository');
    const id = randomUUID();
    await redisProvider.save(`globalNotificationMessages:${id}`, messageIds, 'EX', 300);
    return id;
  }

  private async sendStatusMessage(
    succeeded: number,
    failed: number,
    totalUsers: number,
    id: string,
  ): Promise<void> {
    await this.bot.instance.api.sendMessage(
      ADMIN_TELEGRAM_ID,
      `The messages were sent!\n\nID: ${id}\n\n<b>${succeeded}/${totalUsers} succeeded (${failed} failed)</b>`,
      { parse_mode: 'HTML' },
    );
  }

  public async execute(message: string): Promise<GlobalNotificationResult> {
    const unblockedUsers = await this.usersRepository.findAll(true);
    const messageIds: MessageSent[] = [];
    let failed = 0;

    await this.bot.instance.api.sendMessage(
      ADMIN_TELEGRAM_ID,
      `Starting to send the messages to ${unblockedUsers.length} users...`,
    );

    for (const [index, user] of unblockedUsers.entries()) {
      if (index > 0) {
        await delay(SEND_DELAY_MS);
      }

      try {
        const messageSent = await this.sendMessageToUser(user.telegram_id, message);
        messageIds.push(messageSent);
      } catch (error) {
        failed += 1;
        await checkBotNotificationError(error, user.telegram_id, { message });
      }
    }

    const id = await this.saveMessageIdsToRedis(messageIds);
    await this.sendStatusMessage(messageIds.length, failed, unblockedUsers.length, id);

    return {
      id,
      total: unblockedUsers.length,
      succeeded: messageIds.length,
      failed,
    };
  }
}
