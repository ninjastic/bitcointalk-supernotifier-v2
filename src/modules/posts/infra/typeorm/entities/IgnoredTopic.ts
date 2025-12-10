import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import Post from './Post';

@Entity('ignored_topics')
class IgnoredTopic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('integer')
  topic_id: number;

  @Column('integer')
  post_id: number;

  @OneToOne(() => Post)
  @JoinColumn({ name: 'post_id', referencedColumnName: 'post_id' })
  post: Post;

  @Column({ type: 'bigint', array: true, default: [] })
  ignoring: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default IgnoredTopic;
