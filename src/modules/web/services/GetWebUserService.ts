import { inject, injectable } from 'tsyringe';

import WebUser from '../infra/typeorm/entities/WebUser';
import IWebUsersRepository from '../repositories/IWebUsersRepository';

@injectable()
export default class GetWebUserService {
  constructor(
    @inject('WebUsersRepository')
    private webUsersRepository: IWebUsersRepository,
  ) {}

  public async execute(username: string): Promise<WebUser | undefined> {
    const webUser = this.webUsersRepository.findOneByUsername(username);

    return webUser;
  }
}
