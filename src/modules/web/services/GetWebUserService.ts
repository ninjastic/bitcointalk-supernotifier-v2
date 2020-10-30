import { inject, injectable } from 'tsyringe';

import WebUser from '../infra/typeorm/entities/WebUser';
import IWebUsersRepository from '../repositories/IWebUsersRepository';

interface Params {
  id?: string;
  username?: string;
  user_id?: number;
}

@injectable()
export default class GetWebUserService {
  constructor(
    @inject('WebUsersRepository')
    private webUsersRepository: IWebUsersRepository,
  ) {}

  public async execute(conditions: Params): Promise<WebUser | undefined> {
    const webUser = this.webUsersRepository.findOne(conditions);

    return webUser;
  }
}
