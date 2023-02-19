import { injectable, inject } from 'tsyringe';
import User from '../../../../modules/users/infra/typeorm/entities/User';

import IUsersRepository from '../../../../modules/users/repositories/IUsersRepository';

@injectable()
export default class FindUserByTelegramIdService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  public async execute(telegram_id: number): Promise<User | undefined> {
    const user = await this.usersRepository.findByTelegramId(telegram_id);

    return user;
  }
}
