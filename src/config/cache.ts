export default {
  driver: 'redis',
  config: {
    redis: {
      host: 'localhost',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
    },
  },
};
