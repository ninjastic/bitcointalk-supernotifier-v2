import ModLog from '../infra/typeorm/entities/ModLog';
import CreateModLogDTO from '../dtos/CreateModLogDTO';
import FindModLogDTO from '../dtos/FindModLogDTO';

export default interface IModLogRepository {
  create(data: CreateModLogDTO): ModLog;
  save(modlog: ModLog): Promise<ModLog>;
  findOne(data: FindModLogDTO): Promise<ModLog | undefined>;
  findOneRemoveTopicByTopicId(topic_id: number): Promise<ModLog | undefined>;
  findUnchecked(type?: 'remove_topic' | 'delete_reply' | 'nuke_user' | 'autoban_user'): Promise<ModLog[]>;
}
