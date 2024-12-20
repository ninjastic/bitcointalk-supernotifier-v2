import Post from '../../../../infra/typeorm/entities/Post';
import User from '../../../../../users/infra/typeorm/entities/User';
import IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import IgnoredTopic from '../../../../infra/typeorm/entities/IgnoredTopic';
import { RecipeData } from '../../../../../../shared/infra/bull/types/telegram';
import { NotificationType } from '../../../../../notifications/infra/typeorm/entities/Notification';

type TelegramMentionsCheckerNotificationData = {
  userId: string;
  type: NotificationType.POST_MENTION;
  metadata: RecipeData['sendMentionNotification'];
};

export const telegramMentionsChecker = async (
  post: Post,
  users: User[],
  ignoredUsers: IgnoredUser[],
  ignoredTopics: IgnoredTopic[]
): Promise<TelegramMentionsCheckerNotificationData[]> => {
  const escapeRegexText = (text: string) => text.replace(/([.*+?^${}()|[\]\\<>])/g, '\\$1');
  const data: TelegramMentionsCheckerNotificationData[] = [];

  for await (const user of users) {
    if (!user.username) continue;

    const usernameRegex = new RegExp(`(?<!\\w)${escapeRegexText(user.username)}(?!\\w)`, 'gi');
    const altUsernameRegex = user.alternative_usernames.length
      ? new RegExp(`(?<!\\w)${escapeRegexText(user.alternative_usernames[0])}(?!\\w)`, 'gi')
      : null;
    const backupAtSignRegex = new RegExp(`@${escapeRegexText(user.username)}`, 'gi');
    const backupQuotedRegex = new RegExp(`Quote from: ${escapeRegexText(user.username)} on`, 'gi');

    const regexList = [usernameRegex, altUsernameRegex, backupAtSignRegex, backupQuotedRegex];
    if (!regexList.find(regex => post.content.match(regex))) continue;

    const isSameUsername = post.author.toLowerCase() === user.username.toLowerCase();
    const isSameUid = post.author_uid === user.user_id;
    const isAlreadyNotified = post.notified_to.includes(user.telegram_id);
    const isAuthorIgnored = ignoredUsers
      .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
      ?.ignoring.includes(user.telegram_id);
    const isTopicIgnored = ignoredTopics
      .find(ignoredTopic => ignoredTopic.topic_id === post.topic_id)
      ?.ignoring.includes(user.telegram_id);

    if (isSameUsername || isSameUid || isAlreadyNotified || isAuthorIgnored || isTopicIgnored) continue;

    data.push({
      userId: user.id,
      type: NotificationType.POST_MENTION,
      metadata: { post, user, history: false }
    });
  }

  return data;
};
