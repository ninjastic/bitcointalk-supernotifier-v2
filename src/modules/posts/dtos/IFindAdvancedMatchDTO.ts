export default interface IFindAdvancedMatchDTO {
  id?: string;
  telegram_id?: string;
  name?: string | null;
  title_regex?: string | null;
  content_regex?: string | null;
  only_topics?: boolean;
}
