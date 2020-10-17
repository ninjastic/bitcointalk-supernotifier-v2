import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';

import Post from './Post';

@Entity('posts_addresses')
class PostAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  address: string;

  @Column()
  coin: string;

  @Column()
  post_id: number;

  @OneToOne(() => Post)
  @JoinColumn({ name: 'post_id', referencedColumnName: 'post_id' })
  post: Post;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default PostAddress;
