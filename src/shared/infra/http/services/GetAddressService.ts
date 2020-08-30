import { injectable, inject } from 'tsyringe';

import Address from 'modules/posts/infra/typeorm/entities/Address';
import IAddressesRepository from '../../../../modules/posts/repositories/IAddressesRepository';

@injectable()
export default class GetAddressService {
  constructor(
    @inject('AddressesRepository')
    private addressesRepository: IAddressesRepository,
  ) {}

  public async execute(address: string): Promise<Address> {
    return this.addressesRepository.findOneByAddress(address);
  }
}
