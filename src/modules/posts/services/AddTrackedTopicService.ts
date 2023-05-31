import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import ITrackedTopicsRepository from '../repositories/ITrackedTopicsRepository';

import Post from '../infra/typeorm/entities/Post';
import TrackedTopic from '../infra/typeorm/entities/TrackedTopic';
import forumScraperQueue, { queueEvents } from '../../../shared/infra/bull/queues/forumScraperQueue';

@injectable()
export default class AddTrackedTopicService {
  constructor(
    @inject('TrackedTopicsRepository')
    private trackedTopicsRepository: ITrackedTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(topic_id: number, telegram_id?: string): Promise<TrackedTopic> {
    const topicExists = await this.trackedTopicsRepository.findOneByTopicId(topic_id);

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

    const job = await forumScraperQueue.add('scrapeTopic', { topic_id }, { priority: 1 });

    const topicPost: Post = await job.waitUntilFinished(queueEvents);

    const trackedTopic = this.trackedTopicsRepository.create({
      post_id: topicPost.post_id,
      topic_id: topicPost.topic_id,
      tracking: telegram_id ? [telegram_id] : []
    });

    await this.trackedTopicsRepository.save(trackedTopic);

    const trackedWithTopic = await this.trackedTopicsRepository.findOneByTopicId(topic_id);

    await this.cacheRepository.invalidate(`trackedTopics:${telegram_id}`);
    await this.cacheRepository.invalidate('trackedTopics');

    return trackedWithTopic;
  }
}
