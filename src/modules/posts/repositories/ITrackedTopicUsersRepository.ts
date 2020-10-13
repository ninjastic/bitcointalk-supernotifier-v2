import { DeleteResult } from 'typeorm';

import TrackedTopicUser from '../infra/typeorm/entities/TrackedTopicUser';

import ICreateTrackedTopicUserDTO from '../dtos/ICreateTrackedTopicUserDTO';
import IFindTrackedTopicUserDTO from '../dtos/IFindTrackedTopicUserDTO';

export default interface ITrackedTopicUsersRepository {
  create(data: ICreateTrackedTopicUserDTO): TrackedTopicUser;
  save(trackedTopicUser: TrackedTopicUser): Promise<TrackedTopicUser>;
  find(conditions: IFindTrackedTopicUserDTO): Promise<TrackedTopicUser[]>;
  findOne(conditions: IFindTrackedTopicUserDTO): Promise<TrackedTopicUser>;
  delete(trackedTopicUser: TrackedTopicUser): Promise<DeleteResult>;
}
