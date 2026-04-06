import type {
  NotificationIgnoreIndex,
  PreparedPostMentionContent,
} from '../../../../../../shared/services/utils';
import type User from '../../../../../users/infra/typeorm/entities/User';
import type Post from '../../../../infra/typeorm/entities/Post';
import type TrackedBoard from '../../../../infra/typeorm/entities/TrackedBoard';
import type TrackedPhrase from '../../../../infra/typeorm/entities/TrackedPhrase';
import type TrackedTopic from '../../../../infra/typeorm/entities/TrackedTopic';
import type TrackedTopicUser from '../../../../infra/typeorm/entities/TrackedTopicUser';
import type TrackedUser from '../../../../infra/typeorm/entities/TrackedUser';

export interface PreparedCheckerPost {
  post: Post;
  preparedMentionContent: PreparedPostMentionContent;
}

export interface PreparedTrackedPhrase {
  trackedPhrase: TrackedPhrase;
  expression: RegExp;
}

export interface PreparedTrackedTopicContext {
  trackedTopicsByTopicId: Map<number, TrackedTopic>;
  usersByTelegramId: Map<string, User>;
  trackedTopicUsersByKey: Map<string, TrackedTopicUser[]>;
  ignoredIndex: NotificationIgnoreIndex;
}

export interface PreparedTrackedUserContext {
  trackedUsersByUsername: Map<string, TrackedUser[]>;
}

export interface PreparedTrackedBoardContext {
  trackedBoardsByBoardId: Map<number, TrackedBoard[]>;
  ignoredIndex: NotificationIgnoreIndex;
}
