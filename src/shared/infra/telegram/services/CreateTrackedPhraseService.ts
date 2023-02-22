import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';
import ITrackedPhrasesRepository from '../../../../modules/posts/repositories/ITrackedPhrasesRepository';

import TrackedPhrase from '../../../../modules/posts/infra/typeorm/entities/TrackedPhrase';

@injectable()
export default class CreateTrackedPhraseService {
  constructor(
    @inject('TrackedPhrasesRepository')
    private trackedPhrasesRepository: ITrackedPhrasesRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute({ telegram_id, phrase }: { telegram_id: string; phrase: string }): Promise<TrackedPhrase> {
    const exists = await this.trackedPhrasesRepository.findOne({
      telegram_id,
      phrase
    });

    if (exists) {
      throw new Error('Tracked phrase already exists');
    }

    const trackedTopicUser = this.trackedPhrasesRepository.create({
      telegram_id,
      phrase
    });

    await this.trackedPhrasesRepository.save(trackedTopicUser);

    await this.cacheRepository.invalidate('trackedPhrases');
    await this.cacheRepository.invalidate(`trackedPhrases:${telegram_id}`);

    return trackedTopicUser;
  }
}
