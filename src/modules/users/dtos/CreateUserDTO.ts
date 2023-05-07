export default interface CreateUserDTO {
  user_id?: number;
  username?: string;
  alternative_usernames: Array<string>;
  language: string;
  telegram_id: string;
  enable_mentions: boolean;
  enable_merits: boolean;
  blocked: boolean;
  is_group: boolean;
}
