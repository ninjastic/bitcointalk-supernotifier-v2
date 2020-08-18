import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: false })
  user_id: number;

  @Column()
  @Index({ unique: false })
  username: string;

  @Column({ type: 'varchar', array: true, default: [] })
  alternative_usernames: string[];

  @Column({ default: 'en' })
  language: string;

  @Column({ default: null })
  telegram_id: number;

  @Column()
  enable_mentions: boolean;

  @Column()
  enable_merits: boolean;

  @Column({ default: false })
  blocked: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default User;
