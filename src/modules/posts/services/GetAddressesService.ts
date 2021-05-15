import { injectable, inject } from 'tsyringe';

import Address from '../infra/typeorm/entities/Address';
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
  ): Promise<Address[]> {
    const limit = Math.min(conditions.limit || 20, 200);

    return this.addressesRepository.findAddresses(conditions, limit);
  }
}
