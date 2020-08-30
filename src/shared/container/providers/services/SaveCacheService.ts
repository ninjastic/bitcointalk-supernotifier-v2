import { inject, injectable } from 'tsyringe';

import ICacheProvider from '../models/ICacheProvider';

@injectable()
export default class SaveCacheService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(
    key: string,
    value: any,
    arg?: string,
    time?: number,
  ): Promise<void> {
    return this.cacheRepository.save(key, value, arg, time);
  }
}
