import pino from 'pino';
import { err as pinoErrSerializer } from 'pino-std-serializers';

const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  base: { pid: process.pid },
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
  serializers: {
    error: pinoErrSerializer
  }
});

process.on('uncaughtException', error => {
  logger.fatal({ error });
});

process.on('unhandledRejection', error => {
  logger.fatal({ error });
});

export default logger;
