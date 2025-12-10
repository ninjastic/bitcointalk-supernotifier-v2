import { inject, injectable } from 'tsyringe';

import type ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import type IgnoredUser from '../infra/typeorm/entities/IgnoredUser';
import type IIgnoredUserRepository from '../repositories/IIgnoredUserRepository';

@injectable()
export default class AddIgnoredUserService {
  constructor(
    @inject('IgnoredUserRepository')
    private ignoredUserRepository: IIgnoredUserRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(username: string, telegram_id?: string): Promise<IgnoredUser> {
    const ignoredUserExists = await this.ignoredUserRepository.findOneByUsername(username);

    if (ignoredUserExists) {
      if (!telegram_id) {
        return ignoredUserExists;
      }

      if (ignoredUserExists.ignoring.includes(telegram_id)) {
        throw new Error('User already being ignored.');
      }

      ignoredUserExists.ignoring.push(telegram_id);

      await this.ignoredUserRepository.save(ignoredUserExists);

      await this.cacheRepository.invalidate(`ignoredUsers:${telegram_id}`);
      await this.cacheRepository.invalidate('ignoredUsers');

      return ignoredUserExists;
    }

    const ignoredUser = this.ignoredUserRepository.create({
      username,
      ignoring: telegram_id ? [telegram_id] : [],
    });

    await this.ignoredUserRepository.save(ignoredUser);

    await this.cacheRepository.invalidate(`ignoredUsers:${telegram_id}`);
    await this.cacheRepository.invalidate('ignoredUsers');

    return ignoredUser;
  }
}
