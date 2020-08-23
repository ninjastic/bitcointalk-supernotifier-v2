import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino();
const loggerHttp = pinoHttp();

export { loggerHttp };
export default logger;
