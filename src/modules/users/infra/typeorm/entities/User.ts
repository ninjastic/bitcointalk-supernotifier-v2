import { Entity, Column, CreateDateColumn, UpdateDateColumn, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: false })
  @Column({ type: 'integer', nullable: true })
  user_id?: number;

  @Index({ unique: false })
  @Column({ type: 'varchar', nullable: true })
  username?: string;

  @Column({ type: 'varchar', array: true, default: [] })
  alternative_usernames: string[];

  @Column({ type: 'varchar', default: 'en' })
  language: string;

  @Column('bigint')
  telegram_id: string;

  @Column('boolean')
  enable_mentions: boolean;

  @Column('boolean')
  enable_merits: boolean;

  @Column('boolean')
  enable_modlogs: boolean;

  @Column('boolean')
  enable_auto_track_topics: boolean;

  @Column({ type: 'boolean', default: false })
  blocked: boolean;

  @Column({ type: 'boolean', default: false })
  is_group: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default User;
