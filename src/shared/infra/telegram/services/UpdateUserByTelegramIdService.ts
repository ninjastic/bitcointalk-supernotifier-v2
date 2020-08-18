import { injectable, inject } from 'tsyringe';
import User from '../../../../modules/users/infra/typeorm/entities/User';

import logger from '../../../services/logger';

import IUsersRepository from '../../../../modules/users/repositories/IUsersRepository';

import CreateUserDTO from '../../../../modules/users/dtos/CreateUserDTO';

@injectable()
export default class UpdateUserByTelegramIdService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
  ) {}

  public async execute(
    telegram_id: number,
    data: CreateUserDTO,
  ): Promise<User> {
    const user = await this.usersRepository.findByTelegramId(telegram_id);

    logger.info({ user, data }, 'Updating user');

    user.user_id = data.user_id;
    user.username = data.username;
    user.alternative_usernames = data.alternative_usernames;
    user.enable_mentions = data.enable_mentions;
    user.enable_merits = data.enable_merits;
    user.language = data.language;
    user.blocked = data.blocked;

    await this.usersRepository.save(user);

    return user;
  }
}
