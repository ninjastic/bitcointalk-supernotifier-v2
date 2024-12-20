import Post from '../../../../infra/typeorm/entities/Post';
import IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import IgnoredTopic from '../../../../infra/typeorm/entities/IgnoredTopic';
import TrackedPhrase from '../../../../infra/typeorm/entities/TrackedPhrase';
import { RecipeData } from '../../../../../../shared/infra/bull/types/telegram';

type TelegramTrackedPhrasesCheckerNotificationData = {
  userId: string;
  type: 'tracked_phrase';
  metadata: RecipeData['sendPhraseTrackingNotification'];
};

export const telegramTrackedPhrasesChecker = async (
  post: Post,
  trackedPhrases: TrackedPhrase[],
  ignoredUsers: IgnoredUser[],
  ignoredTopics: IgnoredTopic[]
): Promise<TelegramTrackedPhrasesCheckerNotificationData[]> => {
  const escapeRegexText = (text: string) => text.replace(/([.*+?^${}()|[\]\\<>])/g, '\\$1');
  const data: TelegramTrackedPhrasesCheckerNotificationData[] = [];

  for (const trackedPhrase of trackedPhrases) {
    const { user, phrase } = trackedPhrase;
    const phraseRegex = new RegExp(`(?<!\\w)${escapeRegexText(phrase)}(?!\\w)`, 'gi');

    if (!post.content.match(phraseRegex)) {
      continue;
    }

    const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
    const isSameUid = user.user_id && post.author_uid === user.user_id;
    const isAlreadyNotified = post.notified_to.includes(user.telegram_id);
    const isAuthorIgnored = ignoredUsers
      .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
      ?.ignoring.includes(user.telegram_id);
    const isTopicIgnored = ignoredTopics
      .find(ignoredTopic => ignoredTopic.topic_id === post.topic_id)
      ?.ignoring.includes(user.telegram_id);

    if (isSameUsername || isSameUid || isAlreadyNotified || isAuthorIgnored || isTopicIgnored) {
      continue;
    }

    data.push({
      userId: user.id,
      type: 'tracked_phrase',
      metadata: { post, user, trackedPhrase }
    });
  }

  return data;
};
