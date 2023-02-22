import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn
} from 'typeorm';

import TrackedTopic from './TrackedTopic';
import User from '../../../../users/infra/typeorm/entities/User';

@Entity('tracked_topics_users')
class TrackedTopicUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tracked_topic_id: number;

  @Column({ type: 'bigint' })
  telegram_id: string;

  @OneToOne(() => TrackedTopic)
  @JoinColumn({ name: 'tracked_topic_id', referencedColumnName: 'topic_id' })
  tracked_topic: TrackedTopic;

  @OneToOne(() => User)
  @JoinColumn({ name: 'telegram_id', referencedColumnName: 'telegram_id' })
  user: User;

  @Column()
  username: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default TrackedTopicUser;
