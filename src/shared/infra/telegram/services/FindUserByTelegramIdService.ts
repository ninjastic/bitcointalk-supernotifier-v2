import { inject, injectable } from 'tsyringe';

import type User from '../../../../modules/users/infra/typeorm/entities/User';
import type IUsersRepository from '../../../../modules/users/repositories/IUsersRepository';

@injectable()
export default class FindUserByTelegramIdService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
  ) {}

  public async execute(telegram_id: string): Promise<User | undefined> {
    const user = await this.usersRepository.findByTelegramId(telegram_id);

    return user;
  }
}
