/* eslint-disable max-classes-per-file */
import {
  ChildEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  TableInheritance,
  UpdateDateColumn
} from 'typeorm';

export enum NotificationType {
  POST_MENTION = 'post_mention',
  MERIT = 'merit',
  TRACKED_TOPIC = 'tracked_topic'
}

type PostMentionData = {
  post_id: number;
  history: boolean;
};

type MeritData = {
  post_id: number;
  merit_id: string;
};

type TrackedTopicData = {
  post_id: number;
};

@Entity('notifications')
@TableInheritance({ column: { type: 'enum', enum: NotificationType, name: 'type' } })
class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  telegram_id: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column('jsonb')
  metadata: object;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@ChildEntity(NotificationType.POST_MENTION)
export class PostMentionNotification extends Notification {
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType.POST_MENTION = NotificationType.POST_MENTION;

  @Column('jsonb')
  declare metadata: PostMentionData;
}

@ChildEntity(NotificationType.MERIT)
export class MeritNotification extends Notification {
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType.MERIT = NotificationType.MERIT;

  @Column('jsonb')
  declare metadata: MeritData;
}

@ChildEntity(NotificationType.TRACKED_TOPIC)
export class TrackedTopicNotification extends Notification {
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType.TRACKED_TOPIC = NotificationType.TRACKED_TOPIC;

  @Column('jsonb')
  declare metadata: TrackedTopicData;
}

export default Notification;
