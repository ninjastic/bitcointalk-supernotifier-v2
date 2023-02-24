import { ApiResponse } from '@elastic/elasticsearch';

import PostHistory from '../infra/typeorm/entities/PostHistory';

import IFindAllPostsHistoryDTO from '../dtos/IFindAllPostsHistoryDTO';
import ICreatePostHistoryDTO from '../dtos/ICreatePostHistoryDTO';
import IFindOnePostHistoryDTO from '../dtos/IFindOnePostHistoryDTO';

export default interface IPostsHistoryRepository {
  create(data: ICreatePostHistoryDTO): PostHistory;
  save(post: PostHistory): Promise<PostHistory>;
  findOne(conditions: IFindOnePostHistoryDTO): Promise<PostHistory | undefined>;
  findLatestUncheckedPosts(limit?: number): Promise<PostHistory[]>;
  findAll(conditions?: IFindAllPostsHistoryDTO): Promise<ApiResponse>;
}
