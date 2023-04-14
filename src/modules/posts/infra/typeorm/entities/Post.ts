import { Entity, Column, CreateDateColumn, UpdateDateColumn, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('posts')
class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  post_id: number;

  @Column()
  @Index()
  topic_id: number;

  @Column()
  title: string;

  @Column()
  @Index()
  author: string;

  @Column()
  @Index()
  author_uid: number;

  @Column()
  @Index()
  content: string;

  @Column()
  date: Date;

  edited?: Date;

  topicReplies?: number;

  topicAuthor?: string;

  @Column({ type: 'varchar', array: true, default: [] })
  boards: string[];

  @Column({ nullable: true })
  board_id?: number;

  @Column({ default: false })
  notified: boolean;

  @Column({ type: 'bigint', array: true, default: [] })
  notified_to: string[];

  @Column({ default: false })
  checked: boolean;

  @Column({ default: false })
  archive?: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default Post;
