import cache from 'config/cache';
import IORedis from 'ioredis';

const redis = new IORedis(cache.config.redis);

export default redis;
