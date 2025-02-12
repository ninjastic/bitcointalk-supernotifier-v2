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
import Board from '##/modules/posts/infra/typeorm/entities/Board';

@Entity('posts')
class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column('integer')
  post_id: number;

  @Index()
  @Column('integer')
  topic_id: number;

  @Column('varchar')
  title: string;

  @Index()
  @Column('varchar')
  author: string;

  @Index()
  @Column('integer')
  author_uid: number;

  @Index()
  @Column('varchar')
  content: string;

  @Column('timestamp with time zone')
  date: Date;

  edited?: Date;

  topicReplies?: number;

  topicAuthor?: string;

  @Column({ type: 'varchar', array: true, default: [] })
  boards: string[];

  @Column({ type: 'integer', nullable: true })
  board_id?: number;

  @OneToOne(() => Board)
  @JoinColumn({ name: 'board_id', referencedColumnName: 'board_id' })
  board: Board;

  @Column({ type: 'boolean', default: false })
  notified: boolean;

  @Column({ type: 'bigint', array: true, default: [] })
  notified_to: string[];

  @Column({ type: 'boolean', default: false })
  checked: boolean;

  @Column({ type: 'boolean', default: false })
  archive?: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default Post;
