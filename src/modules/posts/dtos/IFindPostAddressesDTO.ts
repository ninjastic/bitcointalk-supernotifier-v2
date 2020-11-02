export default interface IFindPostAddressesDTO {
  address?: string;
  coin?: string;
  post_id?: number;
  topic_id?: number;
  author?: string;
  board?: number;
  child_boards?: string;
  last?: number;
  order?: 'ASC' | 'DESC';
  after?: string;
  limit?: number;
}
