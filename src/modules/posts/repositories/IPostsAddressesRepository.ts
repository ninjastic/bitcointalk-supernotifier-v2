import PostAddress from '../infra/typeorm/entities/PostAddress';

import ICreatePostAddressDTO from '../dtos/ICreatePostAddressDTO';
import IFindPostAddressesDTO from '../dtos/IFindPostAddressesDTO';

export default interface IPostsAddressesRepository {
  create(data: ICreatePostAddressDTO): PostAddress;
  save(postAddress: PostAddress): Promise<PostAddress>;
  find(conditions?: IFindPostAddressesDTO): Promise<PostAddress[]>;
  findOne(conditions?: IFindPostAddressesDTO): Promise<PostAddress | undefined>;
}
