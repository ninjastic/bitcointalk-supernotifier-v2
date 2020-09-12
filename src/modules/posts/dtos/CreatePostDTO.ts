export default interface CreatePostDTO {
  post_id: number;
  topic_id: number;
  title: string;
  author: string;
  author_uid: number;
  content: string;
  date: Date;
  boards: string[];
  board_id?: number;
  checked: boolean;
  notified: boolean;
  notified_to: number[];
  archive?: boolean;
}
