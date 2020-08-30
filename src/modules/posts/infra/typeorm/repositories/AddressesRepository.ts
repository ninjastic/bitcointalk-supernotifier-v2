import { Repository, getRepository } from 'typeorm';

import ICreateAddressDTO from '../../../dtos/ICreateAddressDTO';

import Address from '../entities/Address';

import IAddressesRepository from '../../../repositories/IAddressesRepository';

export default class AddressesRepository implements IAddressesRepository {
  private ormRepository: Repository<Address>;

  constructor() {
    this.ormRepository = getRepository(Address);
  }

  public create(data: ICreateAddressDTO): Address {
    const address = this.ormRepository.create(data);

    return address;
  }

  public async save(address: Address): Promise<Address> {
    const addressSaved = await this.ormRepository.save(address);

    return addressSaved;
  }

  public async findOneByAddress(address: string): Promise<Address | undefined> {
    return this.ormRepository.findOne({ where: { address } });
  }

  public async findByPostId(post_id: number): Promise<Address[] | undefined> {
    return this.ormRepository
      .createQueryBuilder('addresses')
      .select(['*'])
      .where(`addresses.posts_id @> (:post_id::int4[])`, {
        post_id: `{${post_id}}`,
      })
      .execute();
  }
}
