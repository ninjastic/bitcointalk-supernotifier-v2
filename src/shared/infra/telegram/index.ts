import TelegramBot from './bot';
import logger from '../../services/logger';
import TelegramQueue from '../bull/queues/TelegramQueue';

const bot = new TelegramBot();
const queue = new TelegramQueue();

queue.run();

process.on('unhandledRejection', err => {
  logger.error({ err }, 'Uncaught Rejection');
});

export default bot;
