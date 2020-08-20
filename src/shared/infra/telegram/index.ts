import TelegramBot from './bot';
import logger from '../../services/logger';

const bot = new TelegramBot();

process.on('unhandledRejection', err => {
  logger.error({ err }, 'Uncaught Rejection');
});

export default bot;
