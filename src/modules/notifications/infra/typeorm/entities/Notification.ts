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
  TRACKED_TOPIC = 'tracked_topic',
  TRACKED_BOARD = 'tracked_board',
  TRACKED_USER = 'tracked_user',
  TRACKED_PHRASE = 'tracked_phrase',
  AUTO_TRACK_TOPIC_REQUEST = 'auto_track_topic_request',
  REMOVE_TOPIC = 'remove_topic'
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

type TrackedBoardData = {
  post_id: number;
  board_id: number;
};

type TrackedUserData = {
  post_id: number;
  author: string;
};

type TrackedPhraseData = {
  post_id: number;
  phrase: string;
};

type AutoTrackTopicRequestData = {
  topic_id: number;
  post_id: number;
};

type RemoveTopicData = {
  topic_id: number;
  user_id: number;
  posts_removed_count: number;
};

@Entity('notifications')
@TableInheritance({ column: { type: 'enum', enum: NotificationType, name: 'type' } })
class Notification<T = object> {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  telegram_id: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column('jsonb')
  metadata: T;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@ChildEntity(NotificationType.POST_MENTION)
export class PostMentionNotification extends Notification<PostMentionData> {
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType.POST_MENTION = NotificationType.POST_MENTION;

  @Column('jsonb')
  declare metadata: PostMentionData;
}

@ChildEntity(NotificationType.MERIT)
export class MeritNotification extends Notification<MeritData> {
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType.MERIT = NotificationType.MERIT;

  @Column('jsonb')
  declare metadata: MeritData;
}

@ChildEntity(NotificationType.TRACKED_TOPIC)
export class TrackedTopicNotification extends Notification<TrackedTopicData> {
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType.TRACKED_TOPIC = NotificationType.TRACKED_TOPIC;

  @Column('jsonb')
  declare metadata: TrackedTopicData;
}

@ChildEntity(NotificationType.TRACKED_BOARD)
export class TrackedBoardNotification extends Notification<TrackedBoardData> {
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType.TRACKED_BOARD = NotificationType.TRACKED_BOARD;

  @Column('jsonb')
  declare metadata: TrackedBoardData;
}

@ChildEntity(NotificationType.TRACKED_USER)
export class TrackedUserNotification extends Notification<TrackedUserData> {
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType.TRACKED_USER = NotificationType.TRACKED_USER;

  @Column('jsonb')
  declare metadata: TrackedUserData;
}

@ChildEntity(NotificationType.TRACKED_PHRASE)
export class TrackedPhraseNotification extends Notification<TrackedPhraseData> {
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType.TRACKED_PHRASE = NotificationType.TRACKED_PHRASE;

  @Column('jsonb')
  declare metadata: TrackedPhraseData;
}

@ChildEntity(NotificationType.AUTO_TRACK_TOPIC_REQUEST)
export class AutoTrackTopicRequestNotification extends Notification<AutoTrackTopicRequestData> {
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType.AUTO_TRACK_TOPIC_REQUEST = NotificationType.AUTO_TRACK_TOPIC_REQUEST;

  @Column('jsonb')
  declare metadata: AutoTrackTopicRequestData;
}

@ChildEntity(NotificationType.REMOVE_TOPIC)
export class RemoveTopicNotification extends Notification<RemoveTopicData> {
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType.REMOVE_TOPIC = NotificationType.REMOVE_TOPIC;

  @Column('jsonb')
  declare metadata: RemoveTopicData;
}

export default Notification;
