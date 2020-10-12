export default interface IFindAllPostsHistoryDTO {
  author?: string;
  topic_id?: number;
  deleted?: boolean;
  board?: number;
  last?: Date;
  after_date?: string;
  before_date?: string;
  limit?: number;
}
