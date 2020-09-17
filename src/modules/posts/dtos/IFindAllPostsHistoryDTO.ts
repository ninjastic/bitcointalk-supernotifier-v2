export default interface IFindAllPostsHistoryDTO {
  author?: string;
  topic_id?: number;
  deleted?: boolean;
  board?: number;
  after_date?: string;
  before_date?: string;
  last?: Date;
  limit?: number;
}
