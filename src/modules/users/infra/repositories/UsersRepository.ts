import { getMongoRepository, MongoRepository } from 'typeorm';

import CreateUserDTO from '../../dtos/CreateUserDTO';

import User from '../schemas/User';
import IUsersRepository from '../../repositories/IUsersRepository';

export default class UsersRepository implements IUsersRepository {
  private ormRepository: MongoRepository<User>;

  constructor() {
    this.ormRepository = getMongoRepository(User);
  }

  public create(data: CreateUserDTO): User {
    const user = this.ormRepository.create(data);

    return user;
  }

  public async save(user: User): Promise<User> {
    const userSaved = await this.ormRepository.save(user);

    return userSaved;
  }

  public async findByUserId(user_id: number): Promise<User | undefined> {
    const user = await this.ormRepository.findOne({ user_id });

    return user;
  }

  public async findByTelegramId(
    telegram_id: number,
  ): Promise<User | undefined> {
    const user = await this.ormRepository.findOne({ telegram_id });

    return user;
  }

  public async getUsersWithMentions(): Promise<User[]> {
    const users = await this.ormRepository.find({
      where: { enable_mentions: true },
    });

    return users;
  }

  public async getUsersWithMerits(): Promise<User[]> {
    const users = await this.ormRepository.find({
      where: { enable_merits: true },
    });

    return users;
  }
}
