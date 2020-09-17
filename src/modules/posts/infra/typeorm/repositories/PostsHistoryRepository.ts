import { getRepository, Repository } from 'typeorm';

import IFindOnePostHistoryDTO from 'modules/posts/dtos/IFindOnePostHistoryDTO';
import PostHistory from '../entities/PostHistory';

import ICreatePostHistoryDTO from '../../../dtos/ICreatePostHistoryDTO';

import IPostsHistoryRepository from '../../../repositories/IPostsHistoryRepository';

export default class PostsHistoryRepository implements IPostsHistoryRepository {
  private ormRepository: Repository<PostHistory>;

  constructor() {
    this.ormRepository = getRepository(PostHistory);
  }

  public create(data: ICreatePostHistoryDTO): PostHistory {
    return this.ormRepository.create(data);
  }

  public async save(post: PostHistory): Promise<PostHistory> {
    return this.ormRepository.save(post);
  }

  public async findOne({
    post_id,
    version,
  }: IFindOnePostHistoryDTO): Promise<PostHistory | undefined> {
    return this.ormRepository.findOne({ post_id, version });
  }

  public async findLatestUncheckedPosts(limit: number): Promise<PostHistory[]> {
    return this.ormRepository.find({
      where: {
        checked: false,
        deleted: false,
      },
      order: { post_id: 'DESC' },
      take: limit,
      relations: ['post'],
    });
  }

  public async find(limit: number): Promise<PostHistory[]> {
    return this.ormRepository.find({
      order: { post_id: 'DESC' },
      take: limit,
      relations: ['post'],
    });
  }
}
