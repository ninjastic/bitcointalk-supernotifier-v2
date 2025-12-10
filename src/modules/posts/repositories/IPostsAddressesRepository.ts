import type ICreatePostAddressDTO from '../dtos/ICreatePostAddressDTO';
import type IFindPostAddressesDTO from '../dtos/IFindPostAddressesDTO';
import type PostAddress from '../infra/typeorm/entities/PostAddress';

export default interface IPostsAddressesRepository {
  create: (data: ICreatePostAddressDTO) => PostAddress;
  save: (postAddress: PostAddress) => Promise<PostAddress>;
  find: (conditions?: IFindPostAddressesDTO) => Promise<PostAddress[]>;
  findOne: (conditions?: IFindPostAddressesDTO) => Promise<PostAddress | undefined>;
}
