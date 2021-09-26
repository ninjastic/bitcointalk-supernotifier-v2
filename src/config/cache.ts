export default {
  driver: 'redis',
  config: {
    redis: {
      host: 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
    },
  },
};
