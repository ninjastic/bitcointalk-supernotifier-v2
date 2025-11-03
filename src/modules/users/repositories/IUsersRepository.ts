import type User from '../infra/typeorm/entities/User';
import type CreateUserDTO from '../dtos/CreateUserDTO';

export default interface IUsersRepository {
  create(data: CreateUserDTO): User;
  save(user: User): Promise<User>;
  findByUserId(user_id: number): Promise<User | undefined>;
  findByTelegramId(telegram_id: string): Promise<User | undefined>;
  getUsersWithMentions(): Promise<User[]>;
  getUsersWithMerits(): Promise<User[]>;
  getUsersWithModlogs(): Promise<User[]>;
  findAll(only_unblocked?: boolean): Promise<User[]>;
}
