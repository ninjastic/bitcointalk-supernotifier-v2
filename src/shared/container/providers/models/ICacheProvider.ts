import type Redis from 'ioredis';

interface SaveManyData {
  key: string;
  value: any;
  arg?: string;
  time?: number;
}

export default interface ICacheProvider {
  save: (key: string, value: any, arg?: string, time?: number) => Promise<Redis.Ok | null>;
  saveMany: (values: SaveManyData[]) => Promise<void>;
  recover: <T>(key: string) => Promise<T | null>;
  recoverMany: <T>(keys: string[]) => Promise<T[]>;
  recoverByPrefix: <T>(prefix: string) => Promise<T[]>;
  invalidate: (key: string) => Promise<void>;
  invalidateByPrefix: (prefix: string) => Promise<void>;
}
