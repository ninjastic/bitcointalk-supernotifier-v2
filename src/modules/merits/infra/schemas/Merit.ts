import {
  ObjectID,
  ObjectIdColumn,
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('merits')
class Merit {
  @ObjectIdColumn()
  id: ObjectID;

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

  @Column()
  topic_id: number;

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

export default Merit;
