import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IIgnoredTopicsRepository from '../repositories/IIgnoredTopicsRepository';

import IgnoredTopic from '../infra/typeorm/entities/IgnoredTopic';
import Post from '../infra/typeorm/entities/Post';
import forumScraperQueue, { queueEvents } from '../../../shared/infra/bull/queues/forumScraperQueue';
import scrapeTopicJob from '##/modules/posts/infra/jobs/scrape-topic-job';

@injectable()
export default class AddIgnoredTopicService {
  constructor(
    @inject('IgnoredTopicsRepository')
    private ignoredTopicsRepository: IIgnoredTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(topic_id: number, telegram_id?: string): Promise<IgnoredTopic> {
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

    const { post: topicPost } = await scrapeTopicJob(topic_id, { priority: 1 });

    const ignoredTopic = this.ignoredTopicsRepository.create({
      post_id: topicPost.post_id,
      topic_id: topicPost.topic_id,
      ignoring: telegram_id ? [telegram_id] : []
    });

    await this.ignoredTopicsRepository.save(ignoredTopic);

    const ignoredWithTopic = await this.ignoredTopicsRepository.findOneByTopicId(topic_id);

    await this.cacheRepository.invalidate(`ignoredTopics:${telegram_id}`);
    await this.cacheRepository.invalidate('ignoredTopics');

    return ignoredWithTopic;
  }
}
