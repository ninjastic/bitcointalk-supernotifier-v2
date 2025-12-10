import type { DeleteResult, Repository } from 'typeorm';

import { getRepository } from 'typeorm';

import type { ICreateTrackedUserDTO } from '../../../dtos/ICreateTrackedUserDTO';

import TrackedUser from '../entities/TrackedUser';

export default class TrackedUsersRepository {
  private ormRepository: Repository<TrackedUser>;

  constructor() {
    this.ormRepository = getRepository(TrackedUser);
  }

  public create(data: ICreateTrackedUserDTO): TrackedUser {
    return this.ormRepository.create(data);
  }

  public async save(trackedUser: TrackedUser): Promise<TrackedUser> {
    return this.ormRepository.save(trackedUser);
  }

  public async find(where?: ICreateTrackedUserDTO): Promise<TrackedUser[]> {
    return this.ormRepository.find({
      where,
      relations: ['user'],
    });
  }

  public async findOne(where?: ICreateTrackedUserDTO): Promise<TrackedUser> {
    return this.ormRepository.findOne({
      where,
      relations: ['user'],
    });
  }

  public async findByTelegramId(telegramId: string): Promise<TrackedUser[]> {
    return this.ormRepository.find({
      where: {
        telegram_id: telegramId,
      },
      relations: ['user'],
    });
  }

  public async delete(telegramId: string, username: string): Promise<DeleteResult> {
    return this.ormRepository.delete({ telegram_id: telegramId, username });
  }
}
