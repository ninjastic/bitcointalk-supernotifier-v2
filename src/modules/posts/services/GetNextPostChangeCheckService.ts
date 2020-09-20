import { inject, injectable } from 'tsyringe';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';

@injectable()
export default class GetNextPostChangeCheckService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(post_id: number): Promise<number | undefined> {
    const data = await this.cacheRepository.recoverByPrefix<{ time: number }>(
      `RescrapeForChanges:*:${post_id}`,
    );

    const nextCheck = data && data.length ? data[0].time : undefined;

    return nextCheck;
  }
}
