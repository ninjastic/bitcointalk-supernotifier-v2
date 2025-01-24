import Post from '../../../../infra/typeorm/entities/Post';
import User from '../../../../../users/infra/typeorm/entities/User';
import IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import IgnoredTopic from '../../../../infra/typeorm/entities/IgnoredTopic';
import { RecipeData } from '../../../../../../shared/infra/bull/types/telegram';
import { NotificationType } from '../../../../../notifications/infra/typeorm/entities/Notification';
import logger from '../../../../../../shared/services/logger';

type TelegramMentionsCheckerNotificationData = {
  userId: string;
  type: NotificationType.POST_MENTION;
  metadata: RecipeData['sendMentionNotification'];
};

type TelegramMentionsCheckerParams = {
  posts: Post[];
  users: User[];
  ignoredUsers: IgnoredUser[];
  ignoredTopics: IgnoredTopic[];
};

const escapeRegexText = (text: string): string => text.replace(/([.*+?^${}()|[\]\\<>])/g, '\\$1');

const createMentionRegex = (username: string): RegExp =>
  new RegExp(`(?<!\\w)${escapeRegexText(username)}(?!\\w)`, 'gi');

const isUserMentionedInPost = (post: Post, user: User): boolean => {
  const usernameRegex = createMentionRegex(user.username);
  const altUsernameRegex = user.alternative_usernames.length ? createMentionRegex(user.alternative_usernames[0]) : null;
  const backupAtSignRegex = new RegExp(`@${escapeRegexText(user.username)}`, 'gi');
  const backupQuotedRegex = new RegExp(`Quote from: ${escapeRegexText(user.username)} on`, 'gi');

  const regexList = [usernameRegex, altUsernameRegex, backupAtSignRegex, backupQuotedRegex];
  return regexList.some(regex => post.content.match(regex));
};

const shouldNotifyUser = (
  post: Post,
  user: User,
  ignoredUsers: IgnoredUser[],
  ignoredTopics: IgnoredTopic[]
): boolean => {
  const isSameUsername = post.author.toLowerCase() === user.username.toLowerCase();
  const isSameUid = post.author_uid === user.user_id;
  const isAlreadyNotified = post.notified_to.includes(user.telegram_id);
  const isAuthorIgnored = ignoredUsers
    .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
    ?.ignoring.includes(user.telegram_id);
  const isTopicIgnored = ignoredTopics
    .find(ignoredTopic => ignoredTopic.topic_id === post.topic_id)
    ?.ignoring.includes(user.telegram_id);

  return !(isSameUsername || isSameUid || isAlreadyNotified || isAuthorIgnored || isTopicIgnored);
};

const processPost = (
  post: Post,
  users: User[],
  ignoredUsers: IgnoredUser[],
  ignoredTopics: IgnoredTopic[]
): TelegramMentionsCheckerNotificationData[] => {
  const data: TelegramMentionsCheckerNotificationData[] = [];

  for (const user of users) {
    try {
      if (!user.username || !isUserMentionedInPost(post, user)) continue;

      if (shouldNotifyUser(post, user, ignoredUsers, ignoredTopics)) {
        data.push({
          userId: user.id,
          type: NotificationType.POST_MENTION,
          metadata: { post, user, history: false }
        });
      }
    } catch (error) {
      logger.error(
        { error, post_id: post.post_id, telegram_id: user.telegram_id },
        `Error processing user ${user.telegram_id} for post ${post.post_id}`
      );
    }
  }

  return data;
};

export const telegramMentionsChecker = async ({
  posts,
  users,
  ignoredUsers,
  ignoredTopics
}: TelegramMentionsCheckerParams): Promise<TelegramMentionsCheckerNotificationData[]> => {
  const data: TelegramMentionsCheckerNotificationData[] = [];

  for (const post of posts) {
    try {
      const notifications = processPost(post, users, ignoredUsers, ignoredTopics);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, post_id: post.post_id }, `Error processing post ${post.post_id}`);
    }
  }

  return data;
};
