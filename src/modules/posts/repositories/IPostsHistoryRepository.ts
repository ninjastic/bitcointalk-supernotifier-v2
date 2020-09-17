import PostHistory from '../infra/typeorm/entities/PostHistory';

import ICreatePostHistoryDTO from '../dtos/ICreatePostHistoryDTO';
import IFindOnePostHistoryDTO from '../dtos/IFindOnePostHistoryDTO';

export default interface IPostsHistoryRepository {
  create(data: ICreatePostHistoryDTO): PostHistory;
  save(post: PostHistory): Promise<PostHistory>;
  findOne(conditions: IFindOnePostHistoryDTO): Promise<PostHistory | undefined>;
  findLatestUncheckedPosts(limit: number): Promise<PostHistory[]>;
  find(limit?: number): Promise<PostHistory[]>;
}
