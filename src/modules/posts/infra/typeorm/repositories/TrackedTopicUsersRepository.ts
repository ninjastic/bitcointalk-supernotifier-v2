import { DeleteResult, getRepository, Repository } from 'typeorm';

import TrackedTopicUser from '../entities/TrackedTopicUser';

import ITrackedTopicUsersRepository from '../../../repositories/ITrackedTopicUsersRepository';
import ICreateTrackedTopicUserDTO from '../../../dtos/ICreateTrackedTopicUserDTO';
import IFindTrackedTopicUsersDTO from '../../../dtos/IFindTrackedTopicUserDTO';

export default class TrackedTopicUsersRepository
  implements ITrackedTopicUsersRepository
{
  private ormRepository: Repository<TrackedTopicUser>;

  constructor() {
    this.ormRepository = getRepository(TrackedTopicUser);
  }

  public create(data: ICreateTrackedTopicUserDTO): TrackedTopicUser {
    return this.ormRepository.create(data);
  }

  public async save(
    trackedTopicUser: TrackedTopicUser,
  ): Promise<TrackedTopicUser> {
    return this.ormRepository.save(trackedTopicUser);
  }

  public async find(
    conditions: IFindTrackedTopicUsersDTO,
  ): Promise<TrackedTopicUser[]> {
    return this.ormRepository.find({
      where: conditions,
    });
  }

  public async findOne(
    conditions: IFindTrackedTopicUsersDTO,
  ): Promise<TrackedTopicUser> {
    return this.ormRepository.findOne({
      where: conditions,
    });
  }

  public async delete(
    trackedTopicUser: TrackedTopicUser,
  ): Promise<DeleteResult> {
    return this.ormRepository.delete({ id: trackedTopicUser.id });
  }
}
