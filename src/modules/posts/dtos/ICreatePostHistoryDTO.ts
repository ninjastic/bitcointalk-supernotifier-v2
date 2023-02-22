export default interface ICreatePostHistoryDTO {
  post_id: number;
  title: string;
  content: string;
  boards: string[];
  date: Date;
  version: number;
  checked: boolean;
  deleted?: boolean;
  notified: boolean;
  notified_to: string[];
}
