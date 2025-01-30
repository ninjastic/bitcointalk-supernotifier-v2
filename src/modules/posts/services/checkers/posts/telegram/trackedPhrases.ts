import { NotificationType } from '@/modules/notifications/infra/typeorm/entities/Notification';
import Post from '../../../../infra/typeorm/entities/Post';
import User from '../../../../../users/infra/typeorm/entities/User';
import IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import IgnoredTopic from '../../../../infra/typeorm/entities/IgnoredTopic';
import TrackedPhrase from '../../../../infra/typeorm/entities/TrackedPhrase';
import { RecipeData } from '../../../../../../shared/infra/bull/types/telegram';
import logger from '../../../../../../shared/services/logger';

type TelegramTrackedPhrasesCheckerNotificationData = {
  userId: string;
  type: NotificationType.TRACKED_PHRASE;
  metadata: RecipeData['sendPhraseTrackingNotification'];
};

type TelegramTrackedPhrasesCheckerParams = {
  posts: Post[];
  trackedPhrases: TrackedPhrase[];
  ignoredUsers: IgnoredUser[];
  ignoredTopics: IgnoredTopic[];
};

const escapeRegexText = (text: string): string => text.replace(/([.*+?^${}()|[\]\\<>])/g, '\\$1');

const createTrackedPhraseRegex = (phrase: string): RegExp =>
  new RegExp(`(?<!\\w)${escapeRegexText(phrase)}(?!\\w)`, 'gi');

const isPhraseInPost = (post: Post, phraseRegex: RegExp): boolean => post.content.match(phraseRegex) !== null;

const shouldNotifyUser = (
  post: Post,
  user: User,
  ignoredUsers: IgnoredUser[],
  ignoredTopics: IgnoredTopic[]
): boolean => {
  const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
  const isSameUid = user.user_id && post.author_uid === user.user_id;
  const isAlreadyNotified = post.notified_to.includes(user.telegram_id);
  const isAuthorIgnored = ignoredUsers
    .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
    ?.ignoring.includes(user.telegram_id);
  const isTopicIgnored = ignoredTopics
    .find(ignoredTopic => ignoredTopic.topic_id === post.topic_id)
    ?.ignoring.includes(user.telegram_id);
  const isUserBlocked = user.blocked;

  return !(isSameUsername || isSameUid || isAlreadyNotified || isAuthorIgnored || isTopicIgnored || isUserBlocked);
};

const processPost = (
  post: Post,
  trackedPhrases: TrackedPhrase[],
  ignoredUsers: IgnoredUser[],
  ignoredTopics: IgnoredTopic[]
): TelegramTrackedPhrasesCheckerNotificationData[] => {
  const data: TelegramTrackedPhrasesCheckerNotificationData[] = [];

  for (const trackedPhrase of trackedPhrases) {
    try {
      const { user, phrase } = trackedPhrase;
      const phraseRegex = createTrackedPhraseRegex(phrase);

      if (!isPhraseInPost(post, phraseRegex)) continue;

      if (shouldNotifyUser(post, user, ignoredUsers, ignoredTopics)) {
        data.push({
          userId: user.id,
          type: NotificationType.TRACKED_PHRASE,
          metadata: { post, user, trackedPhrase }
        });
      }
    } catch (error) {
      logger.error(
        { error, post_id: post.post_id, telegram_id: trackedPhrase.user.telegram_id },
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
  ignoredTopics
}: TelegramTrackedPhrasesCheckerParams): Promise<TelegramTrackedPhrasesCheckerNotificationData[]> => {
  const data: TelegramTrackedPhrasesCheckerNotificationData[] = [];

  for (const post of posts) {
    try {
      const notifications = processPost(post, trackedPhrases, ignoredUsers, ignoredTopics);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, post_id: post.post_id }, `Error processing post ${post.post_id}`);
    }
  }

  return data;
};
