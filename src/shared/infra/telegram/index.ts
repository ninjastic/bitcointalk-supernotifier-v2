import 'module-alias/register';
import '@/shared/container';
import { container } from 'tsyringe';
import TelegramBot from './bot';

import '../bull/workers/telegram';

const bot = container.resolve(TelegramBot);

process.on('SIGINT', async () => {
  if (process.env.NODE_ENV === 'production' && bot.runner.isRunning()) {
    await bot.runner.stop();
  }

  process.exit(0);
});

export default bot;
