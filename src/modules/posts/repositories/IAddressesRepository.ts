import Address from '../infra/typeorm/entities/Address';
import ICreateAddressDTO from '../dtos/ICreateAddressDTO';
import IFindAddressesConditionsDTO from '../dtos/IFindAddressesConditionsDTO';

export default interface IAddressesRepository {
  create(data: ICreateAddressDTO): Address;
  save(address: Address): Promise<Address>;
  findOneByAddress(address: string): Promise<Address | undefined>;
  findByPostId(post_id: number): Promise<Address[] | undefined>;
  findLatestPostId(): Promise<number | undefined>;
  findAddresses(
    conditions: IFindAddressesConditionsDTO,
    limit: number,
  ): Promise<Address[]>;
  findAuthorsByAddress(address: string): Promise<string[]>;
}
