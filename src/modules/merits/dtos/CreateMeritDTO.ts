export default interface CreateMeritDTO {
  amount: number;
  sender: string;
  sender_uid: number;
  receiver: string;
  receiver_uid: number;
  date: Date;
  post_id: number;
  topic_id: number;
  notified: boolean;
  notified_to: Array<number>;
  checked: boolean;
}
