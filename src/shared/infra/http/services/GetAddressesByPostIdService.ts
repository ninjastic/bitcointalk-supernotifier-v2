import { injectable, inject } from 'tsyringe';

import IAddressesRepository from '../../../../modules/posts/repositories/IAddressesRepository';

@injectable()
export default class GetAddressesByPostIdService {
  constructor(
    @inject('AddressesRepository')
    private addressesRepository: IAddressesRepository
  ) {}

  public async execute({ post_id }: { post_id: number }): Promise<any> {
    const results = await this.addressesRepository.findByPostId(post_id);

    return results;
  }
}
