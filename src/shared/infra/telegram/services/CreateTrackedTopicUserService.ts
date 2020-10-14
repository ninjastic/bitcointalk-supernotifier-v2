import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';
import ITrackedTopicUsersRepository from '../../../../modules/posts/repositories/ITrackedTopicUsersRepository';

import TrackedTopicUser from '../../../../modules/posts/infra/typeorm/entities/TrackedTopicUser';

@injectable()
export default class CreateTrackedTopicUserService {
  constructor(
    @inject('TrackedTopicUsersRepository')
    private trackedTopicUsersRepository: ITrackedTopicUsersRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute({
    username,
    telegram_id,
    topic_id,
  }: {
    username: string;
    telegram_id: number;
    topic_id: number;
  }): Promise<TrackedTopicUser> {
    const exists = await this.trackedTopicUsersRepository.findOne({
      telegram_id,
      tracked_topic_id: topic_id,
      username,
    });

    if (exists) {
      throw new Error('User already exists in the specified tracked topic');
    }

    const trackedTopicUser = this.trackedTopicUsersRepository.create({
      telegram_id,
      tracked_topic_id: topic_id,
      username,
    });

    await this.trackedTopicUsersRepository.save(trackedTopicUser);

    await this.cacheRepository.invalidateByPrefix(
      `trackedTopics:${telegram_id}:*`,
    );

    return trackedTopicUser;
  }
}
