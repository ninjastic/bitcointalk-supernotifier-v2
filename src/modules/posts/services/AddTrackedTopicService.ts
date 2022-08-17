import { injectable, inject } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import ITrackedTopicsRepository from '../repositories/ITrackedTopicsRepository';

import Post from '../infra/typeorm/entities/Post';
import TrackedTopic from '../infra/typeorm/entities/TrackedTopic';

@injectable()
export default class AddTrackedTopicService {
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

    if (topicExists) {
      if (!telegram_id) {
        return topicExists;
      }

      if (topicExists.tracking.includes(telegram_id)) {
        throw new Error('Topic already being tracked.');
      }

      topicExists.tracking.push(telegram_id);

      await this.trackedTopicsRepository.save(topicExists);

      await this.cacheRepository.invalidate(`trackedTopics:${telegram_id}`);
      await this.cacheRepository.invalidate('trackedTopics');

      return topicExists;
    }

    const queue = new Queue('ForumScrapperSideQueue', {
      redis: cacheConfig.config.redis,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
    });

    const job = await queue.add('scrapeTopic', { topic_id }, { priority: 1 });

    const topicPost = (await job.finished()) as Post;

    const trackedTopic = this.trackedTopicsRepository.create({
      post_id: topicPost.post_id,
      topic_id: topicPost.topic_id,
      tracking: telegram_id ? [telegram_id] : [],
    });

    await this.trackedTopicsRepository.save(trackedTopic);

    const trackedWithTopic = await this.trackedTopicsRepository.findOneByTopicId(
      topic_id,
    );

    await queue.close();

    await this.cacheRepository.invalidate(`trackedTopics:${telegram_id}`);
    await this.cacheRepository.invalidate('trackedTopics');

    return trackedWithTopic;
  }
}
