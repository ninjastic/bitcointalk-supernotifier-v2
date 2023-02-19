import { injectable, inject } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IIgnoredTopicsRepository from '../repositories/IIgnoredTopicsRepository';

import IgnoredTopic from '../infra/typeorm/entities/IgnoredTopic';
import Post from '../infra/typeorm/entities/Post';

@injectable()
export default class AddIgnoredTopicService {
  constructor(
    @inject('IgnoredTopicsRepository')
    private ignoredTopicsRepository: IIgnoredTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(topic_id: number, telegram_id?: number): Promise<IgnoredTopic> {
    const ignoredTopicExists = await this.ignoredTopicsRepository.findOneByTopicId(topic_id);

    if (ignoredTopicExists) {
      if (!telegram_id) {
        return ignoredTopicExists;
      }

      if (ignoredTopicExists.ignoring.includes(telegram_id)) {
        throw new Error('Topic already being ignored.');
      }

      ignoredTopicExists.ignoring.push(telegram_id);

      await this.ignoredTopicsRepository.save(ignoredTopicExists);

      await this.cacheRepository.invalidate(`ignoredTopics:${telegram_id}`);
      await this.cacheRepository.invalidate('ignoredTopics');

      return ignoredTopicExists;
    }

    const queue = new Queue('ForumScrapperSideQueue', {
      redis: cacheConfig.config.redis,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true }
    });

    const job = await queue.add('scrapeTopic', { topic_id }, { priority: 1 });

    const topicPost = (await job.finished()) as Post;

    const ignoredTopic = this.ignoredTopicsRepository.create({
      post_id: topicPost.post_id,
      topic_id: topicPost.topic_id,
      ignoring: telegram_id ? [telegram_id] : []
    });

    await this.ignoredTopicsRepository.save(ignoredTopic);

    const ignoredWithTopic = await this.ignoredTopicsRepository.findOneByTopicId(topic_id);

    await queue.close();

    await this.cacheRepository.invalidate(`ignoredTopics:${telegram_id}`);
    await this.cacheRepository.invalidate('ignoredTopics');

    return ignoredWithTopic;
  }
}
