import { injectable, inject } from 'tsyringe';
import User from '../../../../modules/users/infra/typeorm/entities/User';

import IUsersRepository from '../../../../modules/users/repositories/IUsersRepository';

@injectable()
export default class SetUserAlternativeUsernameService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  public async execute(telegram_id: number, username: string): Promise<User> {
    const user = await this.usersRepository.findByTelegramId(telegram_id);

    user.alternative_usernames = [username];

    await this.usersRepository.save(user);

    return user;
  }
}
