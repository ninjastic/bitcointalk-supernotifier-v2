import { injectable, inject } from 'tsyringe';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';
import IgnoredUser from '../../../../modules/users/infra/typeorm/entities/IgnoredUser';

import IIgnoredUserRepository from '../../../../modules/users/repositories/IIgnoredUserRepository';

@injectable()
export default class FindIgnoredUsersByTelegramIdService {
  constructor(
    @inject('IgnoredUserRepository')
    private ignoredUserRepository: IIgnoredUserRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(telegram_id: number): Promise<IgnoredUser[]> {
    const cachedIgnoredUsers = await this.cacheRepository.recover<IgnoredUser[]>(`ignoredUsers:${telegram_id}`);

    if (cachedIgnoredUsers) {
      return cachedIgnoredUsers;
    }

    const ignoredUsers = await this.ignoredUserRepository.findAllByTelegramId(telegram_id);

    await this.cacheRepository.save(`ignoredUsers:${telegram_id}`, ignoredUsers);

    return ignoredUsers;
  }
}
