import { inject, injectable } from 'tsyringe';

import IgnoredTopic from '../infra/typeorm/entities/IgnoredTopic';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IIgnoredTopicsRepository from '../repositories/IIgnoredTopicsRepository';

@injectable()
export default class GetIgnoredUsersService {
  constructor(
    @inject('IgnoredTopicsRepository')
    private ignoredTopicsRepository: IIgnoredTopicsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
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
