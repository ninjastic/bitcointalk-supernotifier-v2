import type { Redis as RedisClient } from 'ioredis';

import Redis from 'ioredis';

import type ICacheProvider from '../models/ICacheProvider';

import cacheConfig from '../../../../config/cache';

interface SaveManyData {
  key: string;
  value: any;
  arg?: string;
  time?: number;
}

export default class RedisProvider implements ICacheProvider {
  private client: RedisClient;

  constructor() {
    this.client = new Redis({ ...cacheConfig.config.redis, connectionName: 'RedisProvider' });
  }

  public async save(key: string, value: any, arg?: string, time?: number): Promise<Redis.Ok | null> {
    if (arg) {
      return this.client.set(key, JSON.stringify(value), arg, time);
    }

    return this.client.set(key, JSON.stringify(value));
  }

  public async saveMany(values: SaveManyData[]): Promise<void> {
    const pipeline = this.client.pipeline();

    values.forEach((value) => {
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

  public async recoverMany<T>(keys: string[]): Promise<(T | null)[]> {
    const pipeline = this.client.pipeline();

    keys.forEach((key) => {
      pipeline.get(key);
    });

    const values: (T | null)[] = [];

    await pipeline.exec((_err, result) => {
      result.forEach((res) => {
        if (res[0]) {
          values.push(null);
        }
        else if (res[1] === null || res[1] === undefined) {
          values.push(null);
        }
        else {
          values.push(JSON.parse(res[1]) as T);
        }
      });
    });

    return values;
  }

  public async recoverByPrefix<T>(prefix: string): Promise<T[]> {
    const keys = await this.client.keys(prefix);

    if (keys.length === 0) {
      return [];
    }

    const pipeline = this.client.pipeline();

    keys.forEach((key) => {
      pipeline.get(key);
    });

    const values: T[] = [];

    await pipeline.exec((_err, result) => {
      result.forEach((res) => {
        if (res[0]) {
          return;
        }
        if (res[1] === null || res[1] === undefined) {
          return;
        }
        const parsed = JSON.parse(res[1]) as T;
        if (parsed !== null) {
          values.push(parsed);
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

    keys.forEach((key) => {
      pipeline.del(key);
    });

    await pipeline.exec();
  }
}
