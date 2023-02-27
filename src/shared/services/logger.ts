import pino from 'pino';

const logger = pino({
  base: { pid: process.pid },
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`
});

export default logger;
