import IORedis from 'ioredis';

import cache from '../../config/cache';

const redis = new IORedis(cache.config.redis);

export default redis;
