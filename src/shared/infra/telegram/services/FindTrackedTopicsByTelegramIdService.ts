import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';
import TrackedTopic from '../../../../modules/posts/infra/typeorm/entities/TrackedTopic';

import ITrackedTopicsRepository from '../../../../modules/posts/repositories/ITrackedTopicsRepository';

@injectable()
export default class FindUserByTelegramIdService {
  constructor(
    @inject('TrackedTopicsRepository')
    private trackedTopicsRepository: ITrackedTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(telegram_id: number): Promise<TrackedTopic[]> {
    const cachedTrackedTopics = await this.cacheRepository.recover<
      TrackedTopic[]
    >(`trackedTopics:${telegram_id}`);

    if (cachedTrackedTopics) {
      return cachedTrackedTopics;
    }

    const trackedTopics =
      await this.trackedTopicsRepository.findAllByTelegramId(telegram_id);

    await this.cacheRepository.save(
      `trackedTopics:${telegram_id}`,
      trackedTopics,
    );

    return trackedTopics;
  }
}
