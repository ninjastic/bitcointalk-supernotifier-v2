export default interface CreateModLogDTO {
  type: 'remove_topic' | 'delete_reply' | 'nuke_user' | 'autoban_user';
  topic_id?: number;
  user_id: number;
  title?: string;
  notified: boolean;
  notified_to: string[];
  checked: boolean;
}
