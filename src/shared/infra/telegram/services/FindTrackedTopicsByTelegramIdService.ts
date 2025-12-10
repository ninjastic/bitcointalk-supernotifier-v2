import { inject, injectable } from 'tsyringe';

import type TrackedTopic from '../../../../modules/posts/infra/typeorm/entities/TrackedTopic';
import type ITrackedTopicsRepository from '../../../../modules/posts/repositories/ITrackedTopicsRepository';
import type ICacheProvider from '../../../container/providers/models/ICacheProvider';

@injectable()
export default class FindTrackedTopicsByTelegramIdService {
  constructor(
    @inject('TrackedTopicsRepository')
    private trackedTopicsRepository: ITrackedTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(telegram_id: string): Promise<TrackedTopic[]> {
    const cachedTrackedTopics = await this.cacheRepository.recover<TrackedTopic[]>(`trackedTopics:${telegram_id}`);

    if (cachedTrackedTopics) {
      return cachedTrackedTopics;
    }

    const trackedTopics = await this.trackedTopicsRepository.findAllByTelegramId(telegram_id);

    await this.cacheRepository.save(`trackedTopics:${telegram_id}`, trackedTopics);

    return trackedTopics;
  }
}
