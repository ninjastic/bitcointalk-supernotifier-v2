import { Job } from 'bullmq';
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

export type RecipeData = {
  sendMeritNotification: { merit: Merit; user: User };
  sendMentionNotification: { post: Post; user: User; history: boolean };
  sendTopicTrackingNotification: { post: Post; user: User };
  sendPhraseTrackingNotification: { post: Post; user: User; trackedPhrase: TrackedPhrase };
  sendTrackedBoardNotification: { post: Post; user: User; trackedBoard: TrackedBoard };
  sendTrackedUserNotification: { post: Post; user: User };
  sendRemovedTopicNotification: { postsDeleted: Post[]; user: User; modLog: ModLog };
  sendAutoTrackTopicRequestNotification: { topic: Topic; user: User };

  sendApiNotification: { telegram_id: string; message: string };
};

export type JobRecipe = {
  [K in keyof RecipeData]: (job: Job<RecipeData[K], any, K>) => Promise<void>;
};
