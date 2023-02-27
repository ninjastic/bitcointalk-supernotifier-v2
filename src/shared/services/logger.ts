import pino from 'pino';

const logger = pino({
  base: undefined,
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`
});

export default logger;
