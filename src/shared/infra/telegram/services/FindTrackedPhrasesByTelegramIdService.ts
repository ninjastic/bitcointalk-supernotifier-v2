import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';
import TrackedPhrase from '../../../../modules/posts/infra/typeorm/entities/TrackedPhrase';

import ITrackedTopicsRepository from '../../../../modules/posts/repositories/ITrackedPhrasesRepository';

@injectable()
export default class FindTrackedPhrasesByTelegramIdService {
  constructor(
    @inject('TrackedPhrasesRepository')
    private trackedPhrasesRepository: ITrackedTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(telegram_id: string): Promise<TrackedPhrase[]> {
    const cachedTrackedPhrases = await this.cacheRepository.recover<TrackedPhrase[]>(`trackedPhrases:${telegram_id}`);

    if (cachedTrackedPhrases) {
      return cachedTrackedPhrases;
    }

    const trackedPhrases = await this.trackedPhrasesRepository.find({
      telegram_id
    });

    await this.cacheRepository.save(`trackedPhrases:${telegram_id}`, trackedPhrases);

    return trackedPhrases;
  }
}
