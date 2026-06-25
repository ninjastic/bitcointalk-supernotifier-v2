import { inject, injectable } from 'tsyringe';

import type ICacheProvider from '../../../container/providers/models/ICacheProvider';
import type AdvancedMatch from '../../../../modules/posts/infra/typeorm/entities/AdvancedMatch';
import type IAdvancedMatchesRepository from '../../../../modules/posts/repositories/IAdvancedMatchesRepository';

@injectable()
export default class FindAdvancedMatchesByTelegramIdService {
  constructor(
    @inject('AdvancedMatchesRepository')
    private advancedMatchesRepository: IAdvancedMatchesRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(telegram_id: string): Promise<AdvancedMatch[]> {
    const cachedAdvancedMatches = await this.cacheRepository.recover<AdvancedMatch[]>(
      `advancedMatches:${telegram_id}`,
    );

    if (cachedAdvancedMatches) {
      return cachedAdvancedMatches;
    }

    const advancedMatches = await this.advancedMatchesRepository.find({ telegram_id });
    await this.cacheRepository.save(`advancedMatches:${telegram_id}`, advancedMatches, 'EX', 1800);
    return advancedMatches;
  }
}
