import { inject, injectable } from 'tsyringe';

import type ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import type IgnoredTopic from '../infra/typeorm/entities/IgnoredTopic';
import type IIgnoredTopicsRepository from '../repositories/IIgnoredTopicsRepository';

@injectable()
export default class RemoveIgnoredTopicService {
  constructor(
    @inject('IgnoredTopicsRepository')
    private ignoredTopicsRepository: IIgnoredTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(post_id: number, telegram_id?: string): Promise<IgnoredTopic> {
    const ignoredTopicExists = await this.ignoredTopicsRepository.findOneByPostId(post_id);

    if (!ignoredTopicExists) {
      throw new Error('Ignored topic does not exist.');
    }

    const index = ignoredTopicExists.ignoring.indexOf(telegram_id);

    if (index !== -1) {
      ignoredTopicExists.ignoring.splice(index, 1);
      await this.ignoredTopicsRepository.save(ignoredTopicExists);
      await this.cacheRepository.invalidate(`ignoredTopics:${telegram_id}`);
      await this.cacheRepository.invalidate('ignoredTopics');
    }

    return ignoredTopicExists;
  }
}
