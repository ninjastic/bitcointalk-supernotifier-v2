import type CreateIgnoredUserDTO from '../dtos/CreateIgnoredUserDTO';
import type IgnoredUser from '../infra/typeorm/entities/IgnoredUser';

export default interface IIgnoredUserRepository {
  create: (data: CreateIgnoredUserDTO) => IgnoredUser;
  save: (user: IgnoredUser) => Promise<IgnoredUser>;
  findOneByUsername: (username: string) => Promise<IgnoredUser | undefined>;
  findAllByTelegramId: (telegram_id: string) => Promise<IgnoredUser[]>;
  findAllWithUsers: () => Promise<IgnoredUser[]>;
}
