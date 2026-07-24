import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('modlog')
@Index(['type', 'user_id'])
@Index(['type', 'created_at'])
class ModLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  type:
    | 'remove_topic'
    | 'delete_reply'
    | 'nuke_user'
    | 'autoban_user'
    | 'sig_ban'
    | 'sig_ban_removed';

  @Column({ type: 'integer', nullable: true })
  post_id: number;

  @Column({ type: 'integer', nullable: true })
  topic_id: number;

  @Column('integer')
  user_id: number;

  @Column({ type: 'varchar', nullable: true })
  title: string;

  @Column({ type: 'boolean', default: false })
  notified: boolean;

  @Column({ type: 'bigint', array: true, default: [] })
  notified_to: string[];

  @Column({ type: 'boolean', default: false })
  checked: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default ModLog;
