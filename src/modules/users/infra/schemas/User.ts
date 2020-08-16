import {
  ObjectID,
  ObjectIdColumn,
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
class User {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  @Index({ unique: false })
  user_id: number;

  @Column()
  @Index({ unique: false })
  username: string;

  @Column({ default: [] })
  alternative_usernames: Array<string>;

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
