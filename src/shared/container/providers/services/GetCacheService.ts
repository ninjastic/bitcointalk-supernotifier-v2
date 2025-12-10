import { inject, injectable } from 'tsyringe';

import type ICacheProvider from '../models/ICacheProvider';

@injectable()
export default class GetCacheService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute<T>(key: string): Promise<T | null> {
    return this.cacheRepository.recover<T>(key);
  }
}
