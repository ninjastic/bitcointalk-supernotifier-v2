import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IIgnoredUserRepository from '../repositories/IIgnoredUserRepository';

import IgnoredUser from '../infra/typeorm/entities/IgnoredUser';

@injectable()
export default class AddIgnoredUserService {
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
    const ignoredUserExists = await this.ignoredUserRepository.findOneByUsername(
      username,
    );

    if (ignoredUserExists) {
      if (!telegram_id) {
        return ignoredUserExists;
      }

      if (ignoredUserExists.ignoring.includes(telegram_id)) {
        throw new Error('User already being ignored.');
      }

      ignoredUserExists.ignoring.push(telegram_id);

      await this.ignoredUserRepository.save(ignoredUserExists);

      this.cacheRepository.invalidate(`ignoredUsers:${telegram_id}`);
      this.cacheRepository.invalidate('ignoredUsers');

      return ignoredUserExists;
    }

    const ignoredUser = this.ignoredUserRepository.create({
      username,
      ignoring: telegram_id ? [telegram_id] : [],
    });

    await this.ignoredUserRepository.save(ignoredUser);

    this.cacheRepository.invalidate(`ignoredUsers:${telegram_id}`);
    this.cacheRepository.invalidate('ignoredUsers');

    return ignoredUser;
  }
}
