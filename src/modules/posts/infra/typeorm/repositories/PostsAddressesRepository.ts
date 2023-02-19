import { getRepository, Repository } from 'typeorm';

import PostAddress from '../entities/PostAddress';

import IPostsAddressesRepository from '../../../repositories/IPostsAddressesRepository';

import IFindPostAddressesDTO from '../../../dtos/IFindPostAddressesDTO';
import ICreatePostAddressDTO from '../../../dtos/ICreatePostAddressDTO';

export default class PostsAddressesRepository implements IPostsAddressesRepository {
  private ormRepository: Repository<PostAddress>;

  constructor() {
    this.ormRepository = getRepository(PostAddress);
  }

  public create(data: ICreatePostAddressDTO): PostAddress {
    return this.ormRepository.create(data);
  }

  public async save(postAddress: PostAddress): Promise<PostAddress> {
    return this.ormRepository.save(postAddress);
  }

  public async find(conditions: IFindPostAddressesDTO): Promise<PostAddress[]> {
    const { limit, order, ...rest } = conditions || {};

    return this.ormRepository.find({
      where: rest,
      take: limit || 100,
      order: {
        post_id: order
      }
    });
  }

  public async findOne(conditions: IFindPostAddressesDTO): Promise<PostAddress | undefined> {
    const { order, ...rest } = conditions || {};

    return this.ormRepository.findOne({
      where: rest,
      order: {
        post_id: order
      }
    });
  }
}
