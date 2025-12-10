import type ICreateAddressDTO from '../dtos/ICreateAddressDTO';
import type IFindAddressesByAuthorDTO from '../dtos/IFindAddressesByAuthorDTO';
import type IFindAddressesConditionsDTO from '../dtos/IFindAddressesConditionsDTO';
import type Address from '../infra/typeorm/entities/Address';

export default interface IAddressesRepository {
  create: (data: ICreateAddressDTO) => Address;
  save: (address: Address) => Promise<Address>;
  findOneByAddress: (address: string) => Promise<Address | undefined>;
  findByPostId: (post_id: number) => Promise<Address[] | undefined>;
  findLatestPostId: () => Promise<number | undefined>;
  findAddresses: (conditions: IFindAddressesConditionsDTO, limit: number) => Promise<Address[]>;
  findAuthorsByAddress: (address: string) => Promise<string[]>;
  findAddressesByAuthor: (params: IFindAddressesByAuthorDTO) => Promise<string[]>;
}
