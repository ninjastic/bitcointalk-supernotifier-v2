import { inject, injectable } from 'tsyringe';

import type ICacheProvider from '../../../container/providers/models/ICacheProvider';
import type AdvancedMatch from '../../../../modules/posts/infra/typeorm/entities/AdvancedMatch';
import type IAdvancedMatchesRepository from '../../../../modules/posts/repositories/IAdvancedMatchesRepository';

@injectable()
export default class FindAdvancedMatchesByIdService {
  constructor(
    @inject('AdvancedMatchesRepository')
    private advancedMatchesRepository: IAdvancedMatchesRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(id: string): Promise<AdvancedMatch> {
    const cachedAdvancedMatch = await this.cacheRepository.recover<AdvancedMatch>(
      `advancedMatches:id:${id}`,
    );

    if (cachedAdvancedMatch) {
      return cachedAdvancedMatch;
    }

    const advancedMatch = await this.advancedMatchesRepository.findOne({ id });
    await this.cacheRepository.save(`advancedMatches:id:${id}`, advancedMatch, 'EX', 1800);
    return advancedMatch;
  }
}
