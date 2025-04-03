import pino from 'pino';
import noir from 'pino-noir';
import { err as pinoErrSerializer } from 'pino-std-serializers';

const redaction = noir(['post.content', 'value.new_content', 'value.post.content', 'data.post.content'], 'TRIMMED');

const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  base: { pid: process.pid },
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
  serializers: {
    error: pinoErrSerializer,
    ...redaction
  }
});

process.on('uncaughtException', error => {
  logger.fatal({ error });
});

process.on('unhandledRejection', error => {
  logger.fatal({ error });
});

export default logger;
