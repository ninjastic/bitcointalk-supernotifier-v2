import type { Repository } from 'typeorm';
import { getRepository, MoreThanOrEqual } from 'typeorm';
import { sub } from 'date-fns';

import type FindModLogDTO from '../../../dtos/FindModLogDTO';
import type FindUncheckedTypeDTO from '../../../dtos/FindUncheckedTypeDTO';
import type IModLogRepository from '../../../repositories/IModLogRepository';
import type CreateModLogDTO from '../../../dtos/CreateModLogDTO';

import ModLog from '../entities/ModLog';

export default class ModLogRepository implements IModLogRepository {
  private ormRepository: Repository<ModLog>;

  constructor() {
    this.ormRepository = getRepository(ModLog);
  }

  public create(data: CreateModLogDTO): ModLog {
    return this.ormRepository.create(data);
  }

  public async save(modLog: ModLog): Promise<ModLog> {
    return this.ormRepository.save(modLog);
  }

  public async findOne(data: FindModLogDTO): Promise<ModLog | undefined> {
    return this.ormRepository.findOne({
      where: {
        type: data.type,
        user_id: data.user_id,
        topic_id: data.topic_id
      }
    });
  }

  public async findUnchecked(type: 'remove_topic' | 'delete_reply' | 'nuke_user' | 'autoban_user'): Promise<ModLog[]> {
    const where = {
      checked: false,
      created_at: MoreThanOrEqual(sub(new Date(), { minutes: 60 }))
    } as FindUncheckedTypeDTO;

    if (type) {
      where.type = type;
    }

    return this.ormRepository.find({
      where,
      order: { created_at: -1 }
    });
  }
}
