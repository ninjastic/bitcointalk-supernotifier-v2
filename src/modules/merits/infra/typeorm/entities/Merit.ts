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

  @Column('integer')
  amount: number;

  @Index()
  @Column('varchar')
  sender: string;

  @Index()
  @Column('integer')
  sender_uid: number;

  @Index()
  @Column('varchar')
  receiver: string;

  @Index()
  @Column('integer')
  receiver_uid: number;

  @Column('timestamp with time zone')
  date: Date;

  @Column('integer')
  post_id: number;

  @OneToOne(() => Post)
  @JoinColumn({ name: 'post_id', referencedColumnName: 'post_id' })
  post: Post;

  @Column('integer')
  topic_id: number;

  @Column({ type: 'boolean', default: false })
  notified: boolean;

  @Column({ type: 'integer', array: true, default: [] })
  notified_to: string[];

  @Column({ type: 'boolean', default: false })
  checked: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default Merit;
