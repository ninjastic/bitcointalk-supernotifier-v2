import IgnoredUser from '../infra/typeorm/entities/IgnoredUser';
import CreateIgnoredUserDTO from '../dtos/CreateIgnoredUserDTO';

export default interface IIgnoredUserRepository {
  create(data: CreateIgnoredUserDTO): IgnoredUser;
  save(user: IgnoredUser): Promise<IgnoredUser>;
  findOneByUsername(username: string): Promise<IgnoredUser | undefined>;
  findAllByTelegramId(telegram_id: number): Promise<IgnoredUser[]>;
  findAllWithUsers(): Promise<IgnoredUser[]>;
}
