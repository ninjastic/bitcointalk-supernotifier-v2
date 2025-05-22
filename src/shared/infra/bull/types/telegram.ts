import { Job } from 'bullmq';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import Post from '../../../../modules/posts/infra/typeorm/entities/Post';
import User from '../../../../modules/users/infra/typeorm/entities/User';
import Merit from '../../../../modules/merits/infra/typeorm/entities/Merit';
import ModLog from '../../../../modules/modlog/infra/typeorm/entities/ModLog';
import TrackedPhrase from '../../../../modules/posts/infra/typeorm/entities/TrackedPhrase';
import TrackedBoard from '../../../../modules/posts/infra/typeorm/entities/TrackedBoard';
import Topic from '../../../../modules/posts/infra/typeorm/entities/Topic';

export type RecipeNames =
  | 'sendMentionNotification'
  | 'sendMeritNotification'
  | 'sendTopicTrackingNotification'
  | 'sendRemovedTopicNotification'
  | 'sendPhraseTrackingNotification'
  | 'sendTrackedBoardNotification'
  | 'sendTrackedUserNotification'
  | 'sendApiNotification'
  | 'sendAutoTrackTopicRequestNotification';

export type MentionType = 'username' | 'alternative_username' | 'direct_mention' | 'quoted_mention';

type SendMeritNotificationMetadata = { merit: Merit; user: User };
type SendMentionNotificationMetadata = { post: Post; user: User; history: boolean; mentionType: MentionType };
type SendTopicTrackingNotificationMetadata = { post: Post; user: User };
type SendPhraseTrackingNotificationMetadata = { post: Post; user: User; trackedPhrase: TrackedPhrase };
type SendTrackedBoardNotificationMetadata = { post: Post; user: User; trackedBoard: TrackedBoard };
type SendTrackedUserNotificationMetadata = { post: Post; user: User };
type SendRemovedTopicNotificationMetadata = { postsDeleted: Post[]; user: User; modLog: ModLog };
type SendAutoTrackTopicRequestNotificationMetadata = { topic: Topic; user: User };
type SendApiNotificationMetadata = { telegram_id: string; message: string };

export type RecipeMetadata = {
  sendMeritNotification: SendMeritNotificationMetadata;
  sendMentionNotification: SendMentionNotificationMetadata;
  sendTopicTrackingNotification: SendTopicTrackingNotificationMetadata;
  sendPhraseTrackingNotification: SendPhraseTrackingNotificationMetadata;
  sendTrackedBoardNotification: SendTrackedBoardNotificationMetadata;
  sendTrackedUserNotification: SendTrackedUserNotificationMetadata;
  sendRemovedTopicNotification: SendRemovedTopicNotificationMetadata;
  sendAutoTrackTopicRequestNotification: SendAutoTrackTopicRequestNotificationMetadata;
  sendApiNotification: SendApiNotificationMetadata;
};

export type JobRecipe = {
  [K in keyof RecipeMetadata]: (job: Job<RecipeMetadata[K], any, K>) => Promise<void>;
};

export interface NotificationResult<T extends RecipeMetadata[keyof RecipeMetadata]> {
  userId: string;
  type: NotificationType;
  metadata: T;
}
