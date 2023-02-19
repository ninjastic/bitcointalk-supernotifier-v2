import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import Merit from '../../../../merits/infra/typeorm/entities/Merit';
import Post from '../../../../posts/infra/typeorm/entities/Post';

@Entity('web_notifications')
class WebNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  post_id: number;

  @OneToOne(() => Post)
  @JoinColumn({ name: 'post_id', referencedColumnName: 'post_id' })
  post: Post;

  @OneToOne(() => Merit)
  @JoinColumn({ name: 'merit_id', referencedColumnName: 'id' })
  merit: Merit;

  @Column()
  merit_id: string;

  @CreateDateColumn()
  created_at: Date;

  @CreateDateColumn()
  updated_at: Date;
}

export default WebNotification;
