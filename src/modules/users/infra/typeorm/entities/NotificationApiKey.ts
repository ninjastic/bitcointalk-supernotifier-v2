import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn
} from 'typeorm';

import User from './User';

@Entity('notification_apikeys')
class NotificationApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  api_key: string;

  @Column({ type: 'bigint' })
  telegram_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'telegram_id', referencedColumnName: 'telegram_id' })
  user: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default NotificationApiKey;
