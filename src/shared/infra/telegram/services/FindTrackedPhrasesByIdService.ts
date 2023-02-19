import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';
import TrackedPhrase from '../../../../modules/posts/infra/typeorm/entities/TrackedPhrase';

import ITrackedTopicsRepository from '../../../../modules/posts/repositories/ITrackedPhrasesRepository';

@injectable()
export default class FindTrackedPhrasesByIdService {
  constructor(
    @inject('TrackedPhrasesRepository')
    private trackedPhrasesRepository: ITrackedTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(id: string): Promise<TrackedPhrase> {
    const cachedTrackedPhrases = await this.cacheRepository.recover<TrackedPhrase>(`trackedPhrases:${id}`);

    if (cachedTrackedPhrases) {
      return cachedTrackedPhrases;
    }

    const trackedPhrases = await this.trackedPhrasesRepository.findOne({
      id
    });

    await this.cacheRepository.save(`trackedPhrases:${id}`, trackedPhrases);

    return trackedPhrases;
  }
}
