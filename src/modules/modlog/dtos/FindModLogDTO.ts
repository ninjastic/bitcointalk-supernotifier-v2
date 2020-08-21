export default interface FindModLogDTO {
  type: 'remove_topic' | 'delete_reply' | 'nuke_user' | 'autoban_user';
  user_id: number;
  topic_id: number;
}
