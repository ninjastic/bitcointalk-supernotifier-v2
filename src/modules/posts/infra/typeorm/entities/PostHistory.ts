import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import Post from './Post';

@Entity('posts_history')
class PostHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('integer')
  post_id: number;

  @OneToOne(() => Post)
  @JoinColumn({ name: 'post_id', referencedColumnName: 'post_id' })
  post: Post;

  @Column('varchar')
  title: string;

  @Index()
  @Column('varchar')
  content: string;

  @Column('timestamp with time zone')
  date: Date;

  @Column({ type: 'varchar', array: true, default: [] })
  boards: string[];

  @Column({ type: 'integer', nullable: true })
  board_id?: number;

  @Column('integer')
  version: number;

  @Column({ type: 'boolean', default: false })
  notified: boolean;

  @Column({ type: 'bigint', array: true, default: [] })
  notified_to: string[];

  @Column({ type: 'boolean', default: false })
  checked: boolean;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default PostHistory;
