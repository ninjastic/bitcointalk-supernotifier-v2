import type TelegramBot from '##/shared/infra/telegram/bot';

import axios from 'axios';

interface SendRichTelegramMessageOptions {
  reply_markup?: unknown;
  disable_notification?: boolean;
  protect_content?: boolean;
  link_preview_options?: { is_disabled: boolean };
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

export default async function sendRichTelegramMessage<T = unknown>(
  _bot: TelegramBot,
  chatId: string,
  html: string,
  options: SendRichTelegramMessageOptions = {},
): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  const { data } = await axios.post<TelegramApiResponse<T>>(
    `https://api.telegram.org/bot${token}/sendRichMessage`,
    {
      chat_id: chatId,
      rich_message: { html },
      link_preview_options: { is_disabled: true },
      ...options,
    },
  );

  if (!data.ok || !data.result) {
    throw new Error(data.description || 'Telegram sendRichMessage failed');
  }

  return data.result;
}
