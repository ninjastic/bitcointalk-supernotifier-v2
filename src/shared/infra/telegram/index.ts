import TelegramBot from './bot';
import TelegramQueue from '../bull/queues/TelegramQueue';

const bot = new TelegramBot();
const queue = new TelegramQueue();

queue.run();

export default bot;
