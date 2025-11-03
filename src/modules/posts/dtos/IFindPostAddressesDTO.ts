import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';

export default interface IFindPostAddressesDTO {
  address?: string;
  addresses?: Array<string>;
  coin?: string;
  post_id?: number;
  topic_id?: number;
  author?: string;
  author_uid?: number;
  board?: number;
  child_boards?: string;
  last?: number;
  order?: SortOrder;
  after?: string;
  limit?: number;
}
