import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { createNotificationIgnoreIndex, shouldNotifyUserWithIndex } from '##/shared/services/utils';

import type {
  NotificationResult,
  RecipeMetadata,
} from '../../../../../../shared/infra/bull/types/telegram';
import type IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import type IgnoredBoard from '../../../../infra/typeorm/entities/IgnoredBoard';
import type IgnoredTopic from '../../../../infra/typeorm/entities/IgnoredTopic';
import type Post from '../../../../infra/typeorm/entities/Post';
import type { PreparedTrackedPhrase } from './prepared-checker-data';

import logger from '../../../../../../shared/services/logger';

type TelegramTrackedPhrasesCheckerNotificationResult = NotificationResult<
  RecipeMetadata['sendPhraseTrackingNotification']
>;

interface TelegramTrackedPhrasesCheckerParams {
  posts: Post[];
  trackedPhrases: PreparedTrackedPhrase[];
  ignoredUsers: IgnoredUser[];
  ignoredTopics: IgnoredTopic[];
  ignoredBoards: IgnoredBoard[];
}

const isPhraseInPost = (post: Post, phraseRegex: RegExp): boolean =>
  post.content.match(phraseRegex) !== null;

function processPost(
  post: Post,
  trackedPhrases: PreparedTrackedPhrase[],
  ignoredIndex: ReturnType<typeof createNotificationIgnoreIndex>,
): TelegramTrackedPhrasesCheckerNotificationResult[] {
  const data: TelegramTrackedPhrasesCheckerNotificationResult[] = [];

  for (const trackedPhrase of trackedPhrases) {
    try {
      const { user } = trackedPhrase.trackedPhrase;

      if (!isPhraseInPost(post, trackedPhrase.expression)) continue;
      if (!shouldNotifyUserWithIndex(post, user, ignoredIndex)) continue;

      data.push({
        userId: user.id,
        type: NotificationType.TRACKED_PHRASE,
        metadata: { post, user, trackedPhrase: trackedPhrase.trackedPhrase },
      });
    } catch (error) {
      logger.error(
        { error, postId: post.post_id, telegramId: trackedPhrase.trackedPhrase.user.telegram_id },
        `Error processing user ${trackedPhrase.trackedPhrase.user.telegram_id} for post ${post.post_id}`,
      );
    }
  }

  return data;
}

export async function telegramTrackedPhrasesChecker({
  posts,
  trackedPhrases,
  ignoredUsers,
  ignoredTopics,
  ignoredBoards,
}: TelegramTrackedPhrasesCheckerParams): Promise<
  TelegramTrackedPhrasesCheckerNotificationResult[]
> {
  const data: TelegramTrackedPhrasesCheckerNotificationResult[] = [];
  const ignoredIndex = createNotificationIgnoreIndex(ignoredUsers, ignoredTopics, ignoredBoards);

  for (const post of posts) {
    try {
      const notifications = processPost(post, trackedPhrases, ignoredIndex);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, postId: post.post_id }, `Error processing post ${post.post_id}`);
    }
  }

  return data;
}
