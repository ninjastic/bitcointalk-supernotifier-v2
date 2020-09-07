import { injectable, inject } from 'tsyringe';

import Address from 'modules/posts/infra/typeorm/entities/Address';
import IFindAddressesConditionsDTO from '../dtos/IFindAddressesConditionsDTO';

import IAddressesRepository from '../repositories/IAddressesRepository';

@injectable()
export default class GetAddressService {
  constructor(
    @inject('AddressesRepository')
    private addressesRepository: IAddressesRepository,
  ) {}

  public async execute(
    conditions: IFindAddressesConditionsDTO,
    limit: number,
  ): Promise<Address[]> {
    return this.addressesRepository.findAddresses(conditions, limit);
  }
}