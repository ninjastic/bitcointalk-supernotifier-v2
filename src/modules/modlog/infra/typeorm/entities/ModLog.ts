import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Column } from 'typeorm';

@Entity('modlog')
class ModLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: 'remove_topic' | 'delete_reply' | 'nuke_user' | 'autoban_user';

  @Column({ nullable: true })
  topic_id: number;

  @Column()
  user_id: number;

  @Column({ nullable: true })
  title: string;

  @Column({ default: false })
  notified: boolean;

  @Column({ type: 'bigint', array: true, default: [] })
  notified_to: number[];

  @Column({ default: false })
  checked: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default ModLog;
