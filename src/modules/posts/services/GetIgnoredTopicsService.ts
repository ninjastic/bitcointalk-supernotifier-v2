import { inject, injectable } from 'tsyringe';

import type ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import type IgnoredTopic from '../infra/typeorm/entities/IgnoredTopic';
import type IIgnoredTopicsRepository from '../repositories/IIgnoredTopicsRepository';

@injectable()
export default class GetIgnoredTopicsService {
  constructor(
    @inject('IgnoredTopicsRepository')
    private ignoredTopicsRepository: IIgnoredTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(): Promise<IgnoredTopic[]> {
    const cachedIgnoredTopics = await this.cacheRepository.recover<IgnoredTopic[]>('ignoredTopics');

    if (cachedIgnoredTopics) {
      return cachedIgnoredTopics;
    }

    const ignoredTopics = await this.ignoredTopicsRepository.findAllWithUsers();

    await this.cacheRepository.save('ignoredTopics', ignoredTopics);

    return ignoredTopics;
  }
}
