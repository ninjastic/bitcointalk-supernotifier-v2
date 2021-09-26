import { inject, injectable } from 'tsyringe';

import TrackedPhrase from '../infra/typeorm/entities/TrackedPhrase';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import ITrackedPhrasesRepository from '../repositories/ITrackedPhrasesRepository';

@injectable()
export default class GetTrackedPhrasesService {
  constructor(
    @inject('TrackedPhrasesRepository')
    private trackedPhrasesRepository: ITrackedPhrasesRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(): Promise<TrackedPhrase[]> {
    const cachedTrackedPhrases = await this.cacheRepository.recover<
      TrackedPhrase[]
    >('trackedPhrases');

    if (cachedTrackedPhrases) {
      return cachedTrackedPhrases;
    }

    const trackedPhrases = await this.trackedPhrasesRepository.findAll();

    await this.cacheRepository.save('trackedPhrases', trackedPhrases);

    return trackedPhrases;
  }
}
