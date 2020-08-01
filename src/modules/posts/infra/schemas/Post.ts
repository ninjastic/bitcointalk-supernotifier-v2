import {
  ObjectID,
  ObjectIdColumn,
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('posts')
class Post {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  @Index({ unique: true })
  post_id: number;

  @Column()
  @Index()
  topic_id: number;

  @Column()
  title: string;

  @Column()
  @Index({ fulltext: true })
  author: string;

  @Column()
  @Index()
  author_uid: number;

  @Column()
  @Index()
  content: string;

  @Column()
  date: Date;

  @Column({ default: [] })
  boards: Array<string>;

  @Column({ default: false })
  notified: boolean;

  @Column({ default: [] })
  notified_to: Array<number>;

  @Column({ default: false })
  checked: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default Post;
