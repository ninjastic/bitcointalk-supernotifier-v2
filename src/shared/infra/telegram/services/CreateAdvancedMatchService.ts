import { inject, injectable } from 'tsyringe';

import type ICacheProvider from '../../../container/providers/models/ICacheProvider';
import type ICreateAdvancedMatchDTO from '../../../../modules/posts/dtos/ICreateAdvancedMatchDTO';
import type AdvancedMatch from '../../../../modules/posts/infra/typeorm/entities/AdvancedMatch';
import type IAdvancedMatchesRepository from '../../../../modules/posts/repositories/IAdvancedMatchesRepository';

@injectable()
export default class CreateAdvancedMatchService {
  constructor(
    @inject('AdvancedMatchesRepository')
    private advancedMatchesRepository: IAdvancedMatchesRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  private validateRegex(pattern: string | null | undefined): void {
    if (!pattern) return;
    RegExp(pattern, 'i');
  }

  public async execute(data: ICreateAdvancedMatchDTO): Promise<AdvancedMatch> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Advanced match must have a name');
    }

    if (
      !data.title_regex &&
      !data.content_regex &&
      !data.authors?.length &&
      !data.board_ids?.length &&
      !data.topic_ids?.length
    ) {
      throw new Error('Advanced match must have at least one filter');
    }

    this.validateRegex(data.title_regex);
    this.validateRegex(data.content_regex);

    const advancedMatch = this.advancedMatchesRepository.create(data);
    await this.advancedMatchesRepository.save(advancedMatch);
    await this.cacheRepository.invalidate('advancedMatches');
    await this.cacheRepository.invalidate(`advancedMatches:${data.telegram_id}`);

    return advancedMatch;
  }
}
