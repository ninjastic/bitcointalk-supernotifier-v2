import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { createMentionRegex, shouldNotifyUser } from '##/shared/services/utils';
import logger from '../../../../../../shared/services/logger';
import Post from '../../../../infra/typeorm/entities/Post';
import IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import IgnoredTopic from '../../../../infra/typeorm/entities/IgnoredTopic';
import IgnoredBoard from '../../../../infra/typeorm/entities/IgnoredBoard';
import TrackedPhrase from '../../../../infra/typeorm/entities/TrackedPhrase';
import { NotificationResult, RecipeMetadata } from '../../../../../../shared/infra/bull/types/telegram';

type TelegramTrackedPhrasesCheckerNotificationResult = NotificationResult<
  RecipeMetadata['sendPhraseTrackingNotification']
>;

type TelegramTrackedPhrasesCheckerParams = {
  posts: Post[];
  trackedPhrases: TrackedPhrase[];
  ignoredUsers: IgnoredUser[];
  ignoredTopics: IgnoredTopic[];
  ignoredBoards: IgnoredBoard[];
};

const isPhraseInPost = (post: Post, phraseRegex: RegExp): boolean => post.content.match(phraseRegex) !== null;

const processPost = (
  post: Post,
  trackedPhrases: TrackedPhrase[],
  ignoredUsers: IgnoredUser[],
  ignoredTopics: IgnoredTopic[],
  ignoredBoards: IgnoredBoard[]
): TelegramTrackedPhrasesCheckerNotificationResult[] => {
  const data: TelegramTrackedPhrasesCheckerNotificationResult[] = [];

  for (const trackedPhrase of trackedPhrases) {
    try {
      const { user, phrase } = trackedPhrase;
      const phraseRegex = createMentionRegex(phrase);

      if (!isPhraseInPost(post, phraseRegex)) continue;
      if (!shouldNotifyUser(post, user, ignoredUsers, ignoredTopics, ignoredBoards)) continue;

      data.push({
        userId: user.id,
        type: NotificationType.TRACKED_PHRASE,
        metadata: { post, user, trackedPhrase }
      });
    } catch (error) {
      logger.error(
        { error, postId: post.post_id, telegramId: trackedPhrase.user.telegram_id },
        `Error processing user ${trackedPhrase.user.telegram_id} for post ${post.post_id}`
      );
    }
  }

  return data;
};

export const telegramTrackedPhrasesChecker = async ({
  posts,
  trackedPhrases,
  ignoredUsers,
  ignoredTopics,
  ignoredBoards
}: TelegramTrackedPhrasesCheckerParams): Promise<TelegramTrackedPhrasesCheckerNotificationResult[]> => {
  const data: TelegramTrackedPhrasesCheckerNotificationResult[] = [];

  for (const post of posts) {
    try {
      const notifications = processPost(post, trackedPhrases, ignoredUsers, ignoredTopics, ignoredBoards);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, postId: post.post_id }, `Error processing post ${post.post_id}`);
    }
  }

  return data;
};
