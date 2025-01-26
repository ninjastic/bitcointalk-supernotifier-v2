import { ADMIN_TELEGRAM_ID } from '@/config/admin';
import bot from '@/shared/infra/telegram';

type LogData = {
  message: string;
  metadata: any;
};

export const telegramLog = async ({ message }: LogData) => {
  await bot.instance.api.sendMessage(ADMIN_TELEGRAM_ID, `NEW LOG: ${message}`, { parse_mode: 'HTML' });
};
