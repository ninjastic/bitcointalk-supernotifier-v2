import type TelegramBot from '##/shared/infra/telegram/bot';

import UsersRepository from '##/modules/users/infra/typeorm/repositories/UsersRepository';
import { container } from 'tsyringe';

import toLegacyTelegramHtml from './legacy-telegram-html';

type SendRichTelegramMessageOptions = NonNullable<
  Parameters<TelegramBot['instance']['api']['sendRichMessage']>[2]
>;

type SendTelegramMessageOptions = NonNullable<
  Parameters<TelegramBot['instance']['api']['sendMessage']>[2]
>;

async function shouldUseNewNotifications(chatId: string | number): Promise<boolean> {
  const usersRepository = container.resolve(UsersRepository);
  const user = await usersRepository.findByTelegramId(String(chatId));

  return user?.enable_new_notifications ?? false;
}

export default async function sendRichTelegramMessage<T = unknown>(
  bot: TelegramBot,
  chatId: string | number,
  html: string,
  options: SendRichTelegramMessageOptions = {},
): Promise<T> {
  if (!(await shouldUseNewNotifications(chatId))) {
    return bot.instance.api.sendMessage(chatId, toLegacyTelegramHtml(html), {
      ...(options as SendTelegramMessageOptions),
      parse_mode: 'HTML',
    }) as Promise<T>;
  }

  return bot.instance.api.sendRichMessage(
    chatId,
    { html, skip_entity_detection: true },
    options,
  ) as Promise<T>;
}
