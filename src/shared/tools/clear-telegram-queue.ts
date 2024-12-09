import 'dotenv/config';
import telegramQueue from '../infra/bull/queues/telegramQueue';

async function clearQueue() {
  await telegramQueue.drain(true);

  await telegramQueue.clean(0, 0, 'completed');
  await telegramQueue.clean(0, 0, 'failed');
  await telegramQueue.clean(0, 0, 'delayed');
  await telegramQueue.clean(0, 0, 'active');
  await telegramQueue.clean(0, 0, 'wait');
  await telegramQueue.clean(0, 0, 'paused');
}

clearQueue().then(() => {
  process.exit(0);
});
