export default interface ICreateAdvancedMatchDTO {
  telegram_id: string;
  name: string;
  title_regex?: string | null;
  content_regex?: string | null;
  authors?: string[];
  board_ids?: number[];
  topic_ids?: number[];
  only_topics?: boolean;
}
