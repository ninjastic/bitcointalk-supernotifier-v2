import { inject, injectable } from 'tsyringe';

import type CreateUserDTO from '../../../../modules/users/dtos/CreateUserDTO';
import type User from '../../../../modules/users/infra/typeorm/entities/User';
import type IUsersRepository from '../../../../modules/users/repositories/IUsersRepository';

import logger from '../../../services/logger';

@injectable()
export default class UpdateUserByTelegramIdService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
  ) {}

  public async execute(telegram_id: string, data: CreateUserDTO): Promise<User> {
    const user = await this.usersRepository.findByTelegramId(telegram_id);

    logger.info({ user, data }, 'Updating user');

    const updatedUser: User = Object.assign(user, data);
    await this.usersRepository.save(updatedUser);

    return user;
  }
}
