import { inject, injectable } from 'tsyringe';

import type ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import type TrackedTopic from '../infra/typeorm/entities/TrackedTopic';
import type ITrackedTopicsRepository from '../repositories/ITrackedTopicsRepository';

@injectable()
export default class GetTrackedTopicsService {
  constructor(
    @inject('TrackedTopicsRepository')
    private trackedTopicsRepository: ITrackedTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(): Promise<TrackedTopic[]> {
    const cachedTrackedTopics = await this.cacheRepository.recover<TrackedTopic[]>('trackedTopics');

    if (cachedTrackedTopics) {
      return cachedTrackedTopics;
    }

    const trackedTopics = await this.trackedTopicsRepository.findAllWithUsers();
    await this.cacheRepository.save('trackedTopics', trackedTopics);

    return trackedTopics;
  }
}
