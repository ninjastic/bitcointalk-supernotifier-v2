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

import Post from '../../../../posts/infra/typeorm/entities/Post';

@Entity('merits')
class Merit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  amount: number;

  @Column()
  @Index()
  sender: string;

  @Column()
  @Index()
  sender_uid: number;

  @Column()
  @Index()
  receiver: string;

  @Column()
  @Index()
  receiver_uid: number;

  @Column()
  date: Date;

  @Column()
  post_id: number;

  @OneToOne(() => Post)
  @JoinColumn({ name: 'post_id', referencedColumnName: 'post_id' })
  post: Post;

  @Column()
  topic_id: number;

  @Column({ default: false })
  notified: boolean;

  @Column({ type: 'int', array: true, default: [] })
  notified_to: string[];

  @Column({ default: false })
  checked: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default Merit;
