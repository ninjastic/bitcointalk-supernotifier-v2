import { inject, injectable } from 'tsyringe';

import type CreateUserDTO from '../dtos/CreateUserDTO';
import type User from '../infra/typeorm/entities/User';
import type IUsersRepository from '../repositories/IUsersRepository';

import logger from '../../../shared/services/logger';

@injectable()
export default class CreateUserService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
  ) {}

  public async execute(data: CreateUserDTO): Promise<User> {
    const user = this.usersRepository.create(data);

    logger.info({ user }, '[CreateUserService] Creating new user');

    return this.usersRepository.save(user);
  }
}
