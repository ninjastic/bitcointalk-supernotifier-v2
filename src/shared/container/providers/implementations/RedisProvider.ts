import Redis, { Redis as RedisClient } from 'ioredis';
import cacheConfig from '../../../../config/cache';

import ICacheProvider from '../models/ICacheProvider';

export default class RedisProvider implements ICacheProvider {
  private client: RedisClient;

  constructor() {
    this.client = new Redis(cacheConfig.config.redis);
  }

  public async save(
    key: string,
    value: any,
    arg?: string,
    time?: number,
  ): Promise<void> {
    await this.client.set(key, JSON.stringify(value), arg, time);
  }

  public async recover<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    const parsedData = JSON.parse(data) as T;

    return parsedData;
  }
}
