import { inject, injectable } from 'tsyringe';

import type ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import type IgnoredUser from '../infra/typeorm/entities/IgnoredUser';
import type IIgnoredUserRepository from '../repositories/IIgnoredUserRepository';

@injectable()
export default class RemoveIgnoredUserService {
  constructor(
    @inject('IgnoredUserRepository')
    private ignoredUserRepository: IIgnoredUserRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(username: string, telegram_id?: string): Promise<IgnoredUser> {
    const ignoredUserExists = await this.ignoredUserRepository.findOneByUsername(username);

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
