import type { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type { Job } from 'bullmq';

import type Merit from '../../../../modules/merits/infra/typeorm/entities/Merit';
import type ModLog from '../../../../modules/modlog/infra/typeorm/entities/ModLog';
import type Post from '../../../../modules/posts/infra/typeorm/entities/Post';
import type Topic from '../../../../modules/posts/infra/typeorm/entities/Topic';
import type TrackedBoard from '../../../../modules/posts/infra/typeorm/entities/TrackedBoard';
import type TrackedPhrase from '../../../../modules/posts/infra/typeorm/entities/TrackedPhrase';
import type User from '../../../../modules/users/infra/typeorm/entities/User';

export type RecipeNames
  = | 'sendMentionNotification'
    | 'sendMeritNotification'
    | 'sendTopicTrackingNotification'
    | 'sendRemovedTopicNotification'
    | 'sendPhraseTrackingNotification'
    | 'sendTrackedBoardNotification'
    | 'sendTrackedUserNotification'
    | 'sendApiNotification'
    | 'sendAutoTrackTopicRequestNotification';

export type MentionType = 'username' | 'alternative_username' | 'direct_mention' | 'quoted_mention';

interface SendMeritNotificationMetadata { merit: Merit; user: User; scrapedPostTitle: string | null }
interface SendMentionNotificationMetadata { post: Post; user: User; history: boolean; mentionType: MentionType }
interface SendTopicTrackingNotificationMetadata { post: Post; user: User }
interface SendPhraseTrackingNotificationMetadata { post: Post; user: User; trackedPhrase: TrackedPhrase }
interface SendTrackedBoardNotificationMetadata { post: Post; user: User; trackedBoard: TrackedBoard }
interface SendTrackedUserNotificationMetadata { post: Post; user: User }
interface SendRemovedTopicNotificationMetadata { postsDeleted: Post[]; user: User; modLog: ModLog }
interface SendAutoTrackTopicRequestNotificationMetadata { topic: Topic; user: User }
interface SendApiNotificationMetadata { telegram_id: string; message: string }

export interface RecipeMetadata {
  sendMeritNotification: SendMeritNotificationMetadata;
  sendMentionNotification: SendMentionNotificationMetadata;
  sendTopicTrackingNotification: SendTopicTrackingNotificationMetadata;
  sendPhraseTrackingNotification: SendPhraseTrackingNotificationMetadata;
  sendTrackedBoardNotification: SendTrackedBoardNotificationMetadata;
  sendTrackedUserNotification: SendTrackedUserNotificationMetadata;
  sendRemovedTopicNotification: SendRemovedTopicNotificationMetadata;
  sendAutoTrackTopicRequestNotification: SendAutoTrackTopicRequestNotificationMetadata;
  sendApiNotification: SendApiNotificationMetadata;
}

export type JobRecipe = {
  [K in keyof RecipeMetadata]: (job: Job<RecipeMetadata[K], any, K>) => Promise<void>;
};

export interface NotificationResult<T extends RecipeMetadata[keyof RecipeMetadata]> {
  userId: string;
  type: NotificationType;
  metadata: T;
}
