import Redis, { Redis as RedisClient } from 'ioredis';
import cacheConfig from '../../../../config/cache';

import ICacheProvider from '../models/ICacheProvider';

interface SaveManyData {
  key: string;
  value: any;
  arg?: string;
  time?: number;
}

export default class RedisProvider implements ICacheProvider {
  private client: RedisClient;

  constructor() {
    this.client = new Redis(cacheConfig.config.redis);
  }

  public async save(key: string, value: any, arg?: string, time?: number): Promise<void> {
    if (arg) {
      await this.client.set(key, JSON.stringify(value), arg, time);
    } else {
      await this.client.set(key, JSON.stringify(value));
    }
  }

  public async saveMany(values: SaveManyData[]): Promise<void> {
    const pipeline = this.client.pipeline();

    values.forEach(value => {
      pipeline.set(value.key, JSON.stringify(value.value), value.arg, value.time);
    });

    await pipeline.exec();
  }

  public async recover<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);

    if (!data) {
      return null;
    }

    const parsedData = JSON.parse(data) as T;

    return parsedData;
  }

  public async recoverMany<T>(keys: string[]): Promise<T[]> {
    const pipeline = this.client.pipeline();

    keys.forEach(key => {
      pipeline.get(key);
    });

    const values = [];

    await pipeline.exec((err, result) => {
      result.forEach(res => {
        if (res[0]) {
          values.push(res[0]);
        } else {
          values.push(JSON.parse(res[1]));
        }
      });
    });

    return values;
  }

  public async recoverByPrefix<T>(prefix: string): Promise<T[]> {
    const keys = await this.client.keys(prefix);

    const pipeline = this.client.pipeline();

    keys.forEach(key => {
      pipeline.get(key);
    });

    const values = [];

    await pipeline.exec((err, result) => {
      result.forEach(res => {
        if (res[0]) {
          values.push(res[0]);
        } else {
          values.push(JSON.parse(res[1]));
        }
      });
    });

    return values;
  }

  public async invalidate(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async invalidateByPrefix(prefix: string): Promise<void> {
    const keys = await this.client.keys(prefix);

    const pipeline = this.client.pipeline();

    keys.forEach(key => {
      pipeline.del(key);
    });

    await pipeline.exec();
  }
}
