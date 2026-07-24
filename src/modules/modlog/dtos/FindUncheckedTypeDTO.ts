import type { FindOperator } from 'typeorm';

export default interface FindUncheckedTypeDTO {
  checked: boolean;
  created_at: FindOperator<Date>;
  type?:
    | 'remove_topic'
    | 'delete_reply'
    | 'nuke_user'
    | 'autoban_user'
    | 'sig_ban'
    | 'sig_ban_removed';
}
