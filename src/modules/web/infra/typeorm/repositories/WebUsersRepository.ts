import { getRepository, Repository } from 'typeorm';

import WebUser from '../entities/WebUser';

import ICreateWebUserDTO from '../../../dtos/ICreateWebUserDTO';

import IWebUsersRepository from '../../../repositories/IWebUsersRepository';

export default class WebUsersRepository implements IWebUsersRepository {
  private ormRepository: Repository<WebUser>;

  constructor() {
    this.ormRepository = getRepository(WebUser);
  }

  public create(data: ICreateWebUserDTO): WebUser {
    return this.ormRepository.create(data);
  }

  public async save(webUser: WebUser): Promise<WebUser> {
    return this.ormRepository.save(webUser);
  }

  public async findOneByUsername(
    username: string,
  ): Promise<WebUser | undefined> {
    return this.ormRepository.findOne({
      where: {
        username: username.toLowerCase(),
      },
    });
  }

  public async findAll(): Promise<WebUser[]> {
    return this.ormRepository.find();
  }
}
