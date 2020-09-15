import { injectable, inject } from 'tsyringe';

import IAddressesRepository from '../repositories/IAddressesRepository';

@injectable()
export default class FindAddressesByAuthorService {
  constructor(
    @inject('AddressesRepository')
    private addressesRepository: IAddressesRepository,
  ) {}

  public async execute(username: string): Promise<string[]> {
    return this.addressesRepository.findAddressesByAuthor(username);
  }
}
