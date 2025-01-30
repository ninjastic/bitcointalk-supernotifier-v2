import TelegramBot from './bot';

import '../bull/workers/telegram';

const bot = new TelegramBot();

process.on('SIGINT', async () => {
  if (process.env.NODE_ENV === 'production' && bot.runner.isRunning()) {
    await bot.runner.stop();
  }

  process.exit(0);
});

export default bot;
