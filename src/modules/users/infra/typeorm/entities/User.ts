import { Entity, Column, CreateDateColumn, UpdateDateColumn, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: false })
  @Column({ nullable: true })
  user_id?: number;

  @Index({ unique: false })
  @Column({ nullable: true })
  username?: string;

  @Column({ type: 'varchar', array: true, default: [] })
  alternative_usernames: string[];

  @Column({ default: 'en' })
  language: string;

  @Column()
  telegram_id: string;

  @Column()
  enable_mentions: boolean;

  @Column()
  enable_merits: boolean;

  @Column()
  enable_modlogs: boolean;

  @Column()
  enable_auto_track_topics: boolean;

  @Column({ default: false })
  blocked: boolean;

  @Column({ default: false })
  is_group: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default User;
