import pino from 'pino';
import { telegramLog } from '@/modules/posts/services/checkers/posts/telegram/log';

const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  base: { pid: process.pid },
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
  hooks: {
    logMethod(args, method, level) {
      if (level === logger.levels.values.error) {
        const [obj, msg] = args;

        telegramLog({
          message: msg ?? 'No message',
          metadata: obj
        });
      }

      return method.apply(this, args);
    }
  }
});

process.on('uncaughtException', err => {
  logger.fatal(err);
});

process.on('unhandledRejection', err => {
  logger.fatal(err);
});

export default logger;
