import { inject, injectable } from 'tsyringe';

import type IgnoredTopic from '../../../../modules/posts/infra/typeorm/entities/IgnoredTopic';
import type IIgnoredTopicsRepository from '../../../../modules/posts/repositories/IIgnoredTopicsRepository';
import type ICacheProvider from '../../../container/providers/models/ICacheProvider';

@injectable()
export default class FindIgnoredTopicsByTelegramIdService {
  constructor(
    @inject('IgnoredTopicsRepository')
    private ignoredTopicsRepository: IIgnoredTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(telegram_id: string): Promise<IgnoredTopic[]> {
    const cachedIgnoredTopics = await this.cacheRepository.recover<IgnoredTopic[]>(`ignoredTopics:${telegram_id}`);

    if (cachedIgnoredTopics) {
      return cachedIgnoredTopics;
    }

    const ignoredTopics = await this.ignoredTopicsRepository.findAllByTelegramId(telegram_id);

    await this.cacheRepository.save(`ignoredTopics:${telegram_id}`, ignoredTopics);

    return ignoredTopics;
  }
}
