import { inject, injectable } from 'tsyringe';

import type TrackedPhrase from '../../../../modules/posts/infra/typeorm/entities/TrackedPhrase';
import type ITrackedPhrasesRepository from '../../../../modules/posts/repositories/ITrackedPhrasesRepository';
import type ICacheProvider from '../../../container/providers/models/ICacheProvider';

@injectable()
export default class CreateTrackedPhraseService {
  constructor(
    @inject('TrackedPhrasesRepository')
    private trackedPhrasesRepository: ITrackedPhrasesRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute({ telegram_id, phrase }: { telegram_id: string; phrase: string }): Promise<TrackedPhrase> {
    const exists = await this.trackedPhrasesRepository.findOne({
      telegram_id,
      phrase,
    });

    if (exists) {
      throw new Error('Tracked phrase already exists');
    }

    const trackedTopicUser = this.trackedPhrasesRepository.create({
      telegram_id,
      phrase,
    });

    await this.trackedPhrasesRepository.save(trackedTopicUser);

    await this.cacheRepository.invalidate('trackedPhrases');
    await this.cacheRepository.invalidate(`trackedPhrases:${telegram_id}`);

    return trackedTopicUser;
  }
}
