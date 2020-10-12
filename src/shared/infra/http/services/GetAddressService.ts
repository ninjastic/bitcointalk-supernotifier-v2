import { injectable, inject } from 'tsyringe';

import IAddressesRepository from '../../../../modules/posts/repositories/IAddressesRepository';

@injectable()
export default class GetAddressService {
  constructor(
    @inject('AddressesRepository')
    private addressesRepository: IAddressesRepository,
  ) {}

  public async execute({ address }: { address: string }): Promise<any> {
    const results = await this.addressesRepository.findOneByAddress(address);

    return results;
  }
}
