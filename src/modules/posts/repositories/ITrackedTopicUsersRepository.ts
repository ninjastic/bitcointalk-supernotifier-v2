import type { DeleteResult } from 'typeorm';

import type ICreateTrackedTopicUserDTO from '../dtos/ICreateTrackedTopicUserDTO';
import type IFindTrackedTopicUserDTO from '../dtos/IFindTrackedTopicUserDTO';
import type TrackedTopicUser from '../infra/typeorm/entities/TrackedTopicUser';

export default interface ITrackedTopicUsersRepository {
  create: (data: ICreateTrackedTopicUserDTO) => TrackedTopicUser;
  save: (trackedTopicUser: TrackedTopicUser) => Promise<TrackedTopicUser>;
  find: (conditions: IFindTrackedTopicUserDTO) => Promise<TrackedTopicUser[]>;
  findOne: (conditions: IFindTrackedTopicUserDTO) => Promise<TrackedTopicUser>;
  delete: (trackedTopicUser: TrackedTopicUser) => Promise<DeleteResult>;
}
