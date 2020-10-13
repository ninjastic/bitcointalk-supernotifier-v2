import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';
import ITrackedTopicUsersRepository from '../../../../modules/posts/repositories/ITrackedTopicUsersRepository';

import TrackedTopicUser from '../../../../modules/posts/infra/typeorm/entities/TrackedTopicUser';

@injectable()
export default class DeleteTrackedTopicUserService {
  constructor(
    @inject('TrackedTopicUsersRepository')
    private trackedTopicUsersRepository: ITrackedTopicUsersRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(
    trackedTopicUser: TrackedTopicUser,
  ): Promise<TrackedTopicUser> {
    await this.trackedTopicUsersRepository.delete(trackedTopicUser);

    await this.cacheRepository.invalidateByPrefix(
      `trackedTopics:${trackedTopicUser.telegram_id}:${trackedTopicUser.tracked_topic_id}:*`,
    );

    return trackedTopicUser;
  }
}
