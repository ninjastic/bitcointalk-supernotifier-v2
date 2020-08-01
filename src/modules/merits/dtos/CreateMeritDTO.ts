export default interface CreateMeritDTO {
  amount: number;
  sender: string;
  sender_uid: number;
  receiver: string;
  receiver_uid: number;
  post_id: number;
  topic_id: number;
  date: Date;
}
