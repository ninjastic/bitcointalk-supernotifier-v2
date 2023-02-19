import { inject, injectable } from 'tsyringe';

import ICreateWebUserDTO from '../dtos/ICreateWebUserDTO';

import WebUser from '../infra/typeorm/entities/WebUser';
import IWebUsersRepository from '../repositories/IWebUsersRepository';

@injectable()
export default class CreateWebUserService {
  constructor(
    @inject('WebUsersRepository')
    private webUsersRepository: IWebUsersRepository
  ) {}

  public async execute(data: ICreateWebUserDTO): Promise<WebUser> {
    const webUser = this.webUsersRepository.create(data);
    await this.webUsersRepository.save(webUser);

    return webUser;
  }
}
