import TelegramBot from './bot';
import TelegramQueue from '../bull/queues/TelegramQueue';

const bot = new TelegramBot();
const queue = new TelegramQueue();

queue.run();

process.on('SIGINT', async () => {
  if (process.env.NODE_ENV === 'production' && bot.runner.isRunning()) {
    await bot.runner.stop();
  }

  await queue.close();
  process.exit(0);
});

export default bot;
