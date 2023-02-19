import { injectable, inject } from 'tsyringe';

import IAddressesRepository from '../repositories/IAddressesRepository';

@injectable()
export default class FindAuthorsByAddressService {
  constructor(
    @inject('AddressesRepository')
    private addressesRepository: IAddressesRepository
  ) {}

  public async execute({ address }: { address: string }): Promise<string[]> {
    return this.addressesRepository.findAuthorsByAddress(address);
  }
}
