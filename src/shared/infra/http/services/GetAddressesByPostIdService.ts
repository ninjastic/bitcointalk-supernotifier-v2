import { injectable, inject } from 'tsyringe';

import Address from 'modules/posts/infra/typeorm/entities/Address';
import IAddressesRepository from '../../../../modules/posts/repositories/IAddressesRepository';

@injectable()
export default class GetAddressesByPostIdService {
  constructor(
    @inject('AddressesRepository')
    private addressesRepository: IAddressesRepository,
  ) {}

  public async execute(post_id: number): Promise<Address[]> {
    return this.addressesRepository.findByPostId(post_id);
  }
}
