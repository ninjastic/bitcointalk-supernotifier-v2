import { Repository, getRepository } from 'typeorm';

import ICreateAddressDTO from '../../../dtos/ICreateAddressDTO';
import IAddressesRepository from '../../../repositories/IAddressesRepository';

import Address from '../entities/Address';

import IFindAddressesConditionsDTO from '../../../dtos/IFindAddressesConditionsDTO';

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

  public async findLatestPostId(): Promise<number | undefined> {
    const address = await this.ormRepository.query(
      'SELECT unnest(posts_id) AS post_id FROM addresses ORDER BY post_id DESC LIMIT 1',
    );

    if (address && address[0] && address[0].post_id) {
      return address[0].post_id;
    }

    return undefined;
  }

  public async findAddresses(
    conditions: IFindAddressesConditionsDTO,
    limit: number,
  ): Promise<Address[]> {
    const actual_limit = Math.min(limit || 20, 200);

    const { address } = conditions;

    return this.ormRepository
      .createQueryBuilder('addresses')
      .select(['*'])
      .where(address ? 'address = :address' : '1=1', { address })
      .orderBy('random()')
      .limit(address ? 1 : actual_limit)
      .execute();
  }

  public async findAuthorsByAddress(address: string): Promise<string[]> {
    return this.ormRepository.query(
      'select p.author, p.author_uid, array_agg(p.post_id) as posts_id from addresses a left join posts p on p.post_id = any(posts_id) where address = $1 group by author, author_uid',
      [address],
    );
  }
}
