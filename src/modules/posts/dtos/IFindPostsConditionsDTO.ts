export default interface IFindPostsConditionsDTO {
  author?: string;
  content?: string;
  topic_id?: number;
  board?: number;
  last?: number;
  after?: number;
  after_date?: string;
  before_date?: string;
  limit: number;
  order?: 'ASC' | 'DESC';
}
