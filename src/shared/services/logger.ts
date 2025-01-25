import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  base: { pid: process.pid },
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`
});

process.on('uncaughtException', err => {
  logger.fatal(err);
});

process.on('unhandledRejection', err => {
  logger.fatal(err);
});

export default logger;
