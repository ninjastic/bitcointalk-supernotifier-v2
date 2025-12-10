import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import User from '../../../../users/infra/typeorm/entities/User';
import TrackedTopic from './TrackedTopic';

@Entity('tracked_topics_users')
class TrackedTopicUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('integer')
  tracked_topic_id: number;

  @Column({ type: 'bigint' })
  telegram_id: string;

  @OneToOne(() => TrackedTopic)
  @JoinColumn({ name: 'tracked_topic_id', referencedColumnName: 'topic_id' })
  tracked_topic: TrackedTopic;

  @OneToOne(() => User)
  @JoinColumn({ name: 'telegram_id', referencedColumnName: 'telegram_id' })
  user: User;

  @Column('varchar')
  username: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default TrackedTopicUser;
