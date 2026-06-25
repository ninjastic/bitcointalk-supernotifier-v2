import type TelegramBot from '##/shared/infra/telegram/bot';

type SendRichTelegramMessageOptions = NonNullable<
  Parameters<TelegramBot['instance']['api']['sendRichMessage']>[2]
>;

export default async function sendRichTelegramMessage<T = unknown>(
  bot: TelegramBot,
  chatId: string | number,
  html: string,
  options: SendRichTelegramMessageOptions = {},
): Promise<T> {
  return bot.instance.api.sendRichMessage(chatId, { html }, options) as Promise<T>;
}
