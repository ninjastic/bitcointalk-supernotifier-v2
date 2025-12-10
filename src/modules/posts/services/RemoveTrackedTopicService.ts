import { inject, injectable } from 'tsyringe';

import type ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import type TrackedTopic from '../infra/typeorm/entities/TrackedTopic';
import type ITrackedTopicsRepository from '../repositories/ITrackedTopicsRepository';

@injectable()
export default class RemoveTrackedTopicService {
  constructor(
    @inject('TrackedTopicsRepository')
    private trackedTopicsRepository: ITrackedTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(topic_id: number, telegram_id?: string): Promise<TrackedTopic> {
    const topicExists = await this.trackedTopicsRepository.findOneByTopicId(topic_id);

    if (!topicExists) {
      throw new Error('Tracked topic does not exist.');
    }

    const index = topicExists.tracking.indexOf(telegram_id);

    if (index !== -1) {
      topicExists.tracking.splice(index, 1);
      await this.trackedTopicsRepository.save(topicExists);
      await this.cacheRepository.invalidate(`trackedTopics:${telegram_id}`);
      await this.cacheRepository.invalidate('trackedTopics');
    }

    return topicExists;
  }
}
