import { inject, injectable } from 'tsyringe';

import type IgnoredUser from '../../../../modules/users/infra/typeorm/entities/IgnoredUser';
import type IIgnoredUserRepository from '../../../../modules/users/repositories/IIgnoredUserRepository';
import type ICacheProvider from '../../../container/providers/models/ICacheProvider';

@injectable()
export default class FindIgnoredUsersByTelegramIdService {
  constructor(
    @inject('IgnoredUserRepository')
    private ignoredUserRepository: IIgnoredUserRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(telegram_id: string): Promise<IgnoredUser[]> {
    const cachedIgnoredUsers = await this.cacheRepository.recover<IgnoredUser[]>(`ignoredUsers:${telegram_id}`);

    if (cachedIgnoredUsers) {
      return cachedIgnoredUsers;
    }

    const ignoredUsers = await this.ignoredUserRepository.findAllByTelegramId(telegram_id);

    await this.cacheRepository.save(`ignoredUsers:${telegram_id}`, ignoredUsers);

    return ignoredUsers;
  }
}
