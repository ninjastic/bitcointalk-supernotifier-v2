import { inject, injectable } from 'tsyringe';

import type TrackedPhrase from '../../../../modules/posts/infra/typeorm/entities/TrackedPhrase';
import type ITrackedPhrasesRepository from '../../../../modules/posts/repositories/ITrackedPhrasesRepository';
import type ICacheProvider from '../../../container/providers/models/ICacheProvider';

@injectable()
export default class RemoveTrackedPhraseService {
  constructor(
    @inject('TrackedPhrasesRepository')
    private trackedPhrasesRepository: ITrackedPhrasesRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(id: string, telegram_id?: string): Promise<TrackedPhrase> {
    const phraseExists = await this.trackedPhrasesRepository.findOne({
      id,
      telegram_id,
    });

    if (!phraseExists) {
      throw new Error('Tracked phrase does not exist.');
    }

    await this.trackedPhrasesRepository.delete(phraseExists);
    await this.cacheRepository.invalidate(`trackedPhrases:${telegram_id}`);
    await this.cacheRepository.invalidate('trackedPhrases');

    return phraseExists;
  }
}
