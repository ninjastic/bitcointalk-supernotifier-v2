import { inject, injectable } from 'tsyringe';

import type ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import type AdvancedMatch from '../infra/typeorm/entities/AdvancedMatch';
import type IAdvancedMatchesRepository from '../repositories/IAdvancedMatchesRepository';

@injectable()
export default class GetAdvancedMatchesService {
  constructor(
    @inject('AdvancedMatchesRepository')
    private advancedMatchesRepository: IAdvancedMatchesRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(): Promise<AdvancedMatch[]> {
    const cachedAdvancedMatches =
      await this.cacheRepository.recover<AdvancedMatch[]>('advancedMatches');

    if (cachedAdvancedMatches) {
      return cachedAdvancedMatches;
    }

    const advancedMatches = await this.advancedMatchesRepository.findAll();
    await this.cacheRepository.save('advancedMatches', advancedMatches);
    return advancedMatches;
  }
}
