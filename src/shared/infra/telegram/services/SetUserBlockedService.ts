import { injectable, inject } from 'tsyringe';
import User from '../../../../modules/users/infra/typeorm/entities/User';

import type IUsersRepository from '../../../../modules/users/repositories/IUsersRepository';

@injectable()
export default class SetUserBlockedService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  public async execute(telegram_id: string): Promise<User> {
    const user = await this.usersRepository.findByTelegramId(telegram_id);

    user.blocked = true;

    await this.usersRepository.save(user);

    return user;
  }
}
