import { injectable, inject } from 'tsyringe';
import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import ITrackedTopicsRepository from '../repositories/ITrackedTopicsRepository';

import TrackedTopic from '../infra/typeorm/entities/TrackedTopic';

@injectable()
export default class RemoveTrackedTopicService {
  constructor(
    @inject('TrackedTopicsRepository')
    private trackedTopicsRepository: ITrackedTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(
    topic_id: number,
    telegram_id?: number,
  ): Promise<TrackedTopic> {
    const topicExists = await this.trackedTopicsRepository.findOneByTopicId(
      topic_id,
    );

    if (!topicExists) {
      throw new Error('Tracked topic does not exist.');
    }

    const index = topicExists.tracking.indexOf(telegram_id);

    if (index !== -1) {
      topicExists.tracking.splice(index, 1);
      await this.trackedTopicsRepository.save(topicExists);
      this.cacheRepository.invalidate(`trackedTopics:${telegram_id}`);
      this.cacheRepository.invalidate('trackedTopics');
    }

    return topicExists;
  }
}
