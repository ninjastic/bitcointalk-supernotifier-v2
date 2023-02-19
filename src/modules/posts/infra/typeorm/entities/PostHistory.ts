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

import Post from './Post';

@Entity('posts_history')
class PostHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  post_id: number;

  @OneToOne(() => Post)
  @JoinColumn({ name: 'post_id', referencedColumnName: 'post_id' })
  post: Post;

  @Column()
  title: string;

  @Column()
  @Index()
  content: string;

  @Column()
  date: Date;

  @Column({ type: 'varchar', array: true, default: [] })
  boards: string[];

  @Column({ nullable: true })
  board_id?: number;

  @Column()
  version: number;

  @Column({ default: false })
  notified: boolean;

  @Column({ type: 'integer', array: true, default: [] })
  notified_to: number[];

  @Column({ default: false })
  checked: boolean;

  @Column({ default: false })
  deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default PostHistory;
