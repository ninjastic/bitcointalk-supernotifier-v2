import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('modlog')
class ModLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  type: 'remove_topic' | 'delete_reply' | 'nuke_user' | 'autoban_user';

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
