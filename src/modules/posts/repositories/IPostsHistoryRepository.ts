import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

import type PostHistory from '../infra/typeorm/entities/PostHistory';

import type IFindAllPostsHistoryDTO from '../dtos/IFindAllPostsHistoryDTO';
import type ICreatePostHistoryDTO from '../dtos/ICreatePostHistoryDTO';
import type IFindOnePostHistoryDTO from '../dtos/IFindOnePostHistoryDTO';

export default interface IPostsHistoryRepository {
  create(data: ICreatePostHistoryDTO): PostHistory;
  save(post: PostHistory): Promise<PostHistory>;
  findOne(conditions: IFindOnePostHistoryDTO): Promise<PostHistory | undefined>;
  findLatestUncheckedPosts(limit?: number): Promise<PostHistory[]>;
  findAll(conditions?: IFindAllPostsHistoryDTO): Promise<SearchResponse<PostHistory>>;
}
