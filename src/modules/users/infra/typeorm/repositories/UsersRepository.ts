import type { Repository } from 'typeorm';
import { getRepository } from 'typeorm';

import type FindOneUserDTO from '../../../dtos/FindOneUserDTO';
import type CreateUserDTO from '../../../dtos/CreateUserDTO';

import User from '../entities/User';
import type IUsersRepository from '../../../repositories/IUsersRepository';

export default class UsersRepository implements IUsersRepository {
  private ormRepository: Repository<User>;

  constructor() {
    this.ormRepository = getRepository(User);
  }

  public create(data: CreateUserDTO): User {
    return this.ormRepository.create(data);
  }

  public async save(user: User): Promise<User> {
    return this.ormRepository.save(user);
  }

  public async findOne(where: FindOneUserDTO): Promise<User | undefined> {
    return this.ormRepository.findOne({ where });
  }

  public async findByUserId(user_id: number): Promise<User | undefined> {
    return this.ormRepository.findOne({ user_id });
  }

  public async findByTelegramId(telegram_id: string): Promise<User | undefined> {
    return this.ormRepository.findOne({ telegram_id });
  }

  public async getUsersWithMentions(): Promise<User[]> {
    return this.ormRepository.find({
      where: { enable_mentions: true, blocked: false, is_group: false }
    });
  }

  public async getUsersWithMerits(): Promise<User[]> {
    return this.ormRepository.find({
      where: { enable_merits: true, blocked: false, is_group: false }
    });
  }

  public async getUsersWithModlogs(): Promise<User[]> {
    return this.ormRepository.find({
      where: { enable_modlogs: true, blocked: false, is_group: false }
    });
  }

  public async findAll(only_unblocked?: boolean): Promise<User[]> {
    if (only_unblocked) {
      return this.ormRepository.find({ where: { blocked: false } });
    }
    return this.ormRepository.find();
  }
}
