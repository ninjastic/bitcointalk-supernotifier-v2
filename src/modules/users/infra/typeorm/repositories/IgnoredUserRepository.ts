import { Repository, getRepository } from 'typeorm';

import CreateIgnoredUserDTO from '../../../dtos/CreateIgnoredUserDTO';

import IgnoredUser from '../entities/IgnoredUser';
import IIgnoredUserRepository from '../../../repositories/IIgnoredUserRepository';

export default class IgnoredUserRepository implements IIgnoredUserRepository {
  private ormRepository: Repository<IgnoredUser>;

  constructor() {
    this.ormRepository = getRepository(IgnoredUser);
  }

  public create(data: CreateIgnoredUserDTO): IgnoredUser {
    return this.ormRepository.create(data);
  }

  public async save(ignoredUser: IgnoredUser): Promise<IgnoredUser> {
    return this.ormRepository.save(ignoredUser);
  }

  public async findAllByTelegramId(telegram_id: number): Promise<IgnoredUser[]> {
    const ignoredUsers = await this.ormRepository.find();

    const filteredIgnoredUsers = ignoredUsers.filter(user => user.ignoring.includes(telegram_id));

    return filteredIgnoredUsers;
  }

  public async findOneByUsername(username: string): Promise<IgnoredUser> {
    return this.ormRepository.findOne({ where: { username } });
  }

  public async findAllWithUsers(): Promise<IgnoredUser[]> {
    const ignoredUsers = await this.ormRepository.find();

    const filteredignoredUsers = ignoredUsers.filter(user => user.ignoring.length);

    return filteredignoredUsers;
  }
}
