import { injectable, inject } from 'tsyringe';

import CreateUserDTO from '../dtos/CreateUserDTO';
import IUsersRepository from '../repositories/IUsersRepository';

import User from '../infra/schemas/User';

@injectable()
export default class CreateUserService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
  ) {}

  public async execute(data: CreateUserDTO): Promise<User> {
    const user = this.usersRepository.create(data);

    return this.usersRepository.save(user);
  }
}
