import { inject, injectable } from 'tsyringe';

import type User from '../../../../modules/users/infra/typeorm/entities/User';
import type IUsersRepository from '../../../../modules/users/repositories/IUsersRepository';

@injectable()
export default class SetUserAlternativeUsernameService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
  ) {}

  public async execute(telegram_id: string, username: string): Promise<User> {
    const user = await this.usersRepository.findByTelegramId(telegram_id);

    user.alternative_usernames = [username];

    await this.usersRepository.save(user);

    return user;
  }
}
