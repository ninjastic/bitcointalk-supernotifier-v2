import { inject, injectable } from 'tsyringe';

import type TrackedTopicUser from '../../../../modules/posts/infra/typeorm/entities/TrackedTopicUser';
import type ITrackedTopicUsersRepository from '../../../../modules/posts/repositories/ITrackedTopicUsersRepository';
import type ICacheProvider from '../../../container/providers/models/ICacheProvider';

@injectable()
export default class DeleteTrackedTopicUserService {
  constructor(
    @inject('TrackedTopicUsersRepository')
    private trackedTopicUsersRepository: ITrackedTopicUsersRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(trackedTopicUser: TrackedTopicUser): Promise<TrackedTopicUser> {
    await this.trackedTopicUsersRepository.delete(trackedTopicUser);

    await this.cacheRepository.invalidateByPrefix(`trackedTopics:${trackedTopicUser.telegram_id}:*`);

    return trackedTopicUser;
  }
}
