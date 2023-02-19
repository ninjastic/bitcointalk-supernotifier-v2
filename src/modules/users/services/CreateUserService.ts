import { injectable, inject } from 'tsyringe';

import CreateUserDTO from '../dtos/CreateUserDTO';
import IUsersRepository from '../repositories/IUsersRepository';

import User from '../infra/typeorm/entities/User';
import logger from '../../../shared/services/logger';

@injectable()
export default class CreateUserService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  public async execute(data: CreateUserDTO): Promise<User> {
    const user = this.usersRepository.create(data);

    logger.info({ user }, 'Creating new user');

    return this.usersRepository.save(user);
  }
}
