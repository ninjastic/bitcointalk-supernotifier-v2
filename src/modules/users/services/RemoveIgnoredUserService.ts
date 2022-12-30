import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IIgnoredUserRepository from '../repositories/IIgnoredUserRepository';

import IgnoredUser from '../infra/typeorm/entities/IgnoredUser';

@injectable()
export default class RemoveIgnoredUserService {
  constructor(
    @inject('IgnoredUserRepository')
    private ignoredUserRepository: IIgnoredUserRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(
    username: string,
    telegram_id?: number,
  ): Promise<IgnoredUser> {
    const ignoredUserExists =
      await this.ignoredUserRepository.findOneByUsername(username);

    if (!ignoredUserExists) {
      throw new Error('Ignored user does not exist.');
    }

    const index = ignoredUserExists.ignoring.indexOf(telegram_id);

    if (index !== -1) {
      ignoredUserExists.ignoring.splice(index, 1);
      await this.ignoredUserRepository.save(ignoredUserExists);
      await this.cacheRepository.invalidate(`ignoredUsers:${telegram_id}`);
      await this.cacheRepository.invalidate('ignoredUsers');
    }

    return ignoredUserExists;
  }
}
