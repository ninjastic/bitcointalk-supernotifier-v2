import { getManager } from 'typeorm';
import { inject, injectable } from 'tsyringe';

import type AdvancedMatch from '../../../../modules/posts/infra/typeorm/entities/AdvancedMatch';
import type ICacheProvider from '../../../container/providers/models/ICacheProvider';
import type IAdvancedMatchesRepository from '../../../../modules/posts/repositories/IAdvancedMatchesRepository';

@injectable()
export default class UpdateAdvancedMatchService {
  constructor(
    @inject('AdvancedMatchesRepository')
    private advancedMatchesRepository: IAdvancedMatchesRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(
    id: string,
    telegram_id: string,
    data: Record<string, unknown>,
  ): Promise<AdvancedMatch> {
    const advancedMatch = await this.advancedMatchesRepository.findOne({ id, telegram_id });

    if (!advancedMatch) {
      throw new Error('Advanced match does not exist.');
    }

    const { authors, board_ids, topic_ids, ...rest } = data;
    Object.assign(advancedMatch, rest);

    await getManager().query('DELETE FROM advanced_match_authors WHERE advanced_match_id = $1', [
      id,
    ]);
    await getManager().query('DELETE FROM advanced_match_boards WHERE advanced_match_id = $1', [
      id,
    ]);
    await getManager().query('DELETE FROM advanced_match_topics WHERE advanced_match_id = $1', [
      id,
    ]);

    if (authors !== undefined) {
      advancedMatch.authors = (authors as string[]).map((a) => ({ author: a })) as any;
    }

    if (board_ids !== undefined) {
      advancedMatch.boards = (board_ids as number[]).map((b) => ({ board_id: b })) as any;
    }

    if (topic_ids !== undefined) {
      advancedMatch.topics = (topic_ids as number[]).map((t) => ({ topic_id: t })) as any;
    }

    await this.advancedMatchesRepository.save(advancedMatch);
    await this.cacheRepository.invalidate('advancedMatches');
    await this.cacheRepository.invalidate(`advancedMatches:id:${id}`);
    await this.cacheRepository.invalidate(`advancedMatches:${telegram_id}`);

    return advancedMatch;
  }
}
