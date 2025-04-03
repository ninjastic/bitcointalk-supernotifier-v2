import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn
} from 'typeorm';

import Post from './Post';

@Entity('posts_versions')
class PostVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('integer')
  post_id: number;

  @OneToOne(() => Post)
  @JoinColumn({ name: 'post_id', referencedColumnName: 'post_id' })
  post: Post;

  @Column({ type: 'varchar', nullable: true })
  new_title?: string;

  @Column({ type: 'varchar', nullable: true })
  new_content?: string;

  @Column({ type: 'timestamp', nullable: true })
  edit_date?: Date;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default PostVersion;
