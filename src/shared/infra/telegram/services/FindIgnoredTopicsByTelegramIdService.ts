import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';
import IgnoredTopic from '../../../../modules/posts/infra/typeorm/entities/IgnoredTopic';

import IIgnoredTopicsRepository from '../../../../modules/posts/repositories/IIgnoredTopicsRepository';

@injectable()
export default class FindIgnoredTopicsByTelegramIdService {
  constructor(
    @inject('IgnoredTopicsRepository')
    private ignoredTopicsRepository: IIgnoredTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(telegram_id: number): Promise<IgnoredTopic[]> {
    const cachedIgnoredTopics = await this.cacheRepository.recover<
      IgnoredTopic[]
    >(`ignoredTopics:${telegram_id}`);

    if (cachedIgnoredTopics) {
      return cachedIgnoredTopics;
    }

    const ignoredTopics =
      await this.ignoredTopicsRepository.findAllByTelegramId(telegram_id);

    await this.cacheRepository.save(
      `ignoredTopics:${telegram_id}`,
      ignoredTopics,
    );

    return ignoredTopics;
  }
}
