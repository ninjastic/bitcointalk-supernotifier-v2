import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';
import ITrackedPhrasesRepository from '../../../../modules/posts/repositories/ITrackedPhrasesRepository';

import TrackedPhrase from '../../../../modules/posts/infra/typeorm/entities/TrackedPhrase';

@injectable()
export default class RemoveTrackedPhraseService {
  constructor(
    @inject('TrackedPhrasesRepository')
    private trackedPhrasesRepository: ITrackedPhrasesRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(id: string, telegram_id?: number): Promise<TrackedPhrase> {
    const phraseExists = await this.trackedPhrasesRepository.findOne({
      id,
      telegram_id
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
