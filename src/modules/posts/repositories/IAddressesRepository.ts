import Address from '../infra/typeorm/entities/Address';
import ICreateAddressDTO from '../dtos/ICreateAddressDTO';

export default interface IAddressesRepository {
  create(data: ICreateAddressDTO): Address;
  save(address: Address): Promise<Address>;
  findOneByAddress(address: string): Promise<Address | undefined>;
  findByPostId(post_id: number): Promise<Address[] | undefined>;
}
