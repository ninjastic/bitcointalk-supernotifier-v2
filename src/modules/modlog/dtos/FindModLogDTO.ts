export default interface FindModLogDTO {
  type: 'remove_topic' | 'delete_reply' | 'nuke_user' | 'autoban_user' | 'sig_ban';
  user_id: number;
  topic_id: number;
}
