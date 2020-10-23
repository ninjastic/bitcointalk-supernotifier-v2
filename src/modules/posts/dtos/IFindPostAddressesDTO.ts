export default interface IFindPostAddressesDTO {
  address?: string;
  coin?: string;
  post_id?: number;
  topic_id?: number;
  author?: string;
  board?: number;
  child_boards?: boolean;
  last?: number;
  order?: 'ASC' | 'DESC';
  limit?: number;
}
