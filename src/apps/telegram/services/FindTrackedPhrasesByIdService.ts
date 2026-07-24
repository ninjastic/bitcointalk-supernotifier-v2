import { inject, injectable } from 'tsyringe';

import type TrackedPhrase from '##/modules/posts/infra/typeorm/entities/TrackedPhrase';
import type ITrackedPhrasesRepository from '##/modules/posts/repositories/ITrackedPhrasesRepository';
import type ICacheProvider from '##/platform/cache/providers/models/ICacheProvider';

@injectable()
export default class FindTrackedPhrasesByIdService {
  constructor(
    @inject('TrackedPhrasesRepository')
    private trackedPhrasesRepository: ITrackedPhrasesRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(id: string): Promise<TrackedPhrase> {
    const cachedTrackedPhrases = await this.cacheRepository.recover<TrackedPhrase>(
      `trackedPhrases:${id}`,
    );

    if (cachedTrackedPhrases) {
      return cachedTrackedPhrases;
    }

    const trackedPhrases = await this.trackedPhrasesRepository.findOne({
      id,
    });

    await this.cacheRepository.save(`trackedPhrases:${id}`, trackedPhrases, 'EX', 1800);

    return trackedPhrases;
  }
}
