import { injectable, inject } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import ITrackedTopicsRepository from '../repositories/ITrackedTopicsRepository';

import Post from '../infra/typeorm/entities/Post';
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
    post_id: number,
    telegram_id?: number,
  ): Promise<TrackedTopic> {
    const topicExists = await this.trackedTopicsRepository.findOneByPostId(
      post_id,
    );

    const index = topicExists.tracking.indexOf(telegram_id);

    if (index !== -1) {
      topicExists.tracking.splice(index, 1);
      await this.trackedTopicsRepository.save(topicExists);
      this.cacheRepository.invalidate(`trackedtopics:${telegram_id}`);
    }

    return topicExists;
  }
}
