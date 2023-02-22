import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';
import TrackedTopicUser from '../../../../modules/posts/infra/typeorm/entities/TrackedTopicUser';

import ITrackedTopicUsersRepository from '../../../../modules/posts/repositories/ITrackedTopicUsersRepository';

@injectable()
export default class FindTrackedTopicUsersService {
  constructor(
    @inject('TrackedTopicUsersRepository')
    private trackedTopicUsersRepository: ITrackedTopicUsersRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute({
    telegram_id,
    topic_id,
    username
  }: {
    telegram_id?: string;
    topic_id?: number;
    username?: string;
  }): Promise<TrackedTopicUser[]> {
    const cachedTrackedTopics = await this.cacheRepository.recover<TrackedTopicUser[]>(
      `trackedTopics:${telegram_id}:${topic_id}:${username}`
    );

    if (cachedTrackedTopics) {
      return cachedTrackedTopics;
    }

    const conditions = {} as {
      telegram_id: string;
      tracked_topic_id: number;
      username: string;
    };

    if (telegram_id) {
      conditions.telegram_id = telegram_id;
    }

    if (topic_id) {
      conditions.tracked_topic_id = topic_id;
    }

    if (username) {
      conditions.username = username;
    }

    const trackedTopicUsers = await this.trackedTopicUsersRepository.find(conditions);

    await this.cacheRepository.save(`trackedTopics:${telegram_id}:${topic_id}:${username}`, trackedTopicUsers);

    return trackedTopicUsers;
  }
}
