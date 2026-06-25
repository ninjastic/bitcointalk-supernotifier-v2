import { inject, injectable } from 'tsyringe';

import type ICacheProvider from '../../../container/providers/models/ICacheProvider';
import type AdvancedMatch from '../../../../modules/posts/infra/typeorm/entities/AdvancedMatch';
import type IAdvancedMatchesRepository from '../../../../modules/posts/repositories/IAdvancedMatchesRepository';

@injectable()
export default class RemoveAdvancedMatchService {
  constructor(
    @inject('AdvancedMatchesRepository')
    private advancedMatchesRepository: IAdvancedMatchesRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(id: string, telegram_id: string): Promise<AdvancedMatch> {
    const advancedMatch = await this.advancedMatchesRepository.findOne({ id, telegram_id });

    if (!advancedMatch) {
      throw new Error('Advanced match does not exist.');
    }

    await this.advancedMatchesRepository.delete(advancedMatch);
    await this.cacheRepository.invalidate('advancedMatches');
    await this.cacheRepository.invalidate(`advancedMatches:id:${id}`);
    await this.cacheRepository.invalidate(`advancedMatches:${telegram_id}`);

    return advancedMatch;
  }
}
