export default interface IFindPostsConditionsDTO {
  author?: string;
  content?: string;
  topic_id?: number;
  after_date?: string;
  before_date?: string;
  last?: number;
  after?: number;
}
