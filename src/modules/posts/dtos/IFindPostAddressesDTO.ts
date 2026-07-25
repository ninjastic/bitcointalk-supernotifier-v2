import type { estypes } from '@elastic/elasticsearch';

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
  order?: estypes.SortOrder;
  after?: string;
  limit?: number;
}
