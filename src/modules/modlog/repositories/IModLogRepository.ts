import type CreateModLogDTO from '../dtos/CreateModLogDTO';
import type FindModLogDTO from '../dtos/FindModLogDTO';
import type ModLog from '../infra/typeorm/entities/ModLog';

export default interface IModLogRepository {
  create: (data: CreateModLogDTO) => ModLog;
  save: (modlog: ModLog) => Promise<ModLog>;
  findOne: (data: FindModLogDTO) => Promise<ModLog | undefined>;
  findUnchecked: (type?: 'remove_topic' | 'delete_reply' | 'nuke_user' | 'autoban_user', minutes?: false | number) => Promise<ModLog[]>;
}
