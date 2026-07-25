import type { estypes } from '@elastic/elasticsearch';

import type ICreatePostHistoryDTO from '../dtos/ICreatePostHistoryDTO';
import type IFindAllPostsHistoryDTO from '../dtos/IFindAllPostsHistoryDTO';
import type IFindOnePostHistoryDTO from '../dtos/IFindOnePostHistoryDTO';
import type PostHistory from '../infra/typeorm/entities/PostHistory';

export default interface IPostsHistoryRepository {
  create: (data: ICreatePostHistoryDTO) => PostHistory;
  save: (post: PostHistory) => Promise<PostHistory>;
  findOne: (conditions: IFindOnePostHistoryDTO) => Promise<PostHistory | undefined>;
  findLatestUncheckedPosts: (limit?: number) => Promise<PostHistory[]>;
  findAll: (conditions?: IFindAllPostsHistoryDTO) => Promise<estypes.SearchResponse<PostHistory>>;
}
