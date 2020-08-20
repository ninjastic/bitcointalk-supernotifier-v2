import { inject, injectable } from 'tsyringe';

import IgnoredUser from '../infra/typeorm/entities/IgnoredUser';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IIgnoredUserRepository from '../repositories/IIgnoredUserRepository';

@injectable()
export default class GetIgnoredUsersService {
  constructor(
    @inject('IgnoredUserRepository')
    private ignoredUserRepository: IIgnoredUserRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(): Promise<IgnoredUser[]> {
    const cachedIgnoredUsers = await this.cacheRepository.recover<
      IgnoredUser[]
    >('ignoredUsers');

    if (cachedIgnoredUsers) {
      return cachedIgnoredUsers;
    }

    const ignoredUsers = await this.ignoredUserRepository.findAllWithUsers();

    await this.cacheRepository.save('ignoredUsers', ignoredUsers);

    return ignoredUsers;
  }
}
