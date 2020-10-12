import { injectable, inject } from 'tsyringe';

import IFindAddressesByAuthorDTO from '../dtos/IFindAddressesByAuthorDTO';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IAddressesRepository from '../repositories/IAddressesRepository';

@injectable()
export default class FindAddressesByAuthorService {
  constructor(
    @inject('AddressesRepository')
    private addressesRepository: IAddressesRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute({
    username,
    limit,
    last_address,
    last_created_at,
    last_id,
  }: IFindAddressesByAuthorDTO): Promise<any[]> {
    const actual_limit = Math.min(limit || 20, 200);

    const cachedData = await this.cacheRepository.recover<any[]>(
      `userAddresses:${username}:${last_address}:${last_created_at}:${last_id}:${limit}`,
    );

    if (cachedData) {
      return cachedData;
    }

    const data = await this.addressesRepository.findAddressesByAuthor({
      username: username.toLowerCase(),
      limit: actual_limit,
      last_address,
      last_created_at,
      last_id,
    });

    await this.cacheRepository.save(
      `userAddresses:${username}:${last_address}:${last_created_at}:${last_id}:${limit}`,
      data,
      'EX',
      240,
    );

    return data;
  }
}
