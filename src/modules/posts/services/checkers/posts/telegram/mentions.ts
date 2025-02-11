import { isUserMentionedInPost, shouldNotifyUser } from '##/shared/services/utils';
import logger from '../../../../../../shared/services/logger';
import Post from '../../../../infra/typeorm/entities/Post';
import User from '../../../../../users/infra/typeorm/entities/User';
import IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import IgnoredTopic from '../../../../infra/typeorm/entities/IgnoredTopic';
import { NotificationResult, RecipeMetadata } from '../../../../../../shared/infra/bull/types/telegram';
import { NotificationType } from '../../../../../notifications/infra/typeorm/entities/Notification';

type TelegramMentionsCheckerNotificationResult = NotificationResult<RecipeMetadata['sendMentionNotification']>;

type TelegramMentionsCheckerParams = {
  posts: Post[];
  users: User[];
  ignoredUsers: IgnoredUser[];
  ignoredTopics: IgnoredTopic[];
};

const processPost = (
  post: Post,
  users: User[],
  ignoredUsers: IgnoredUser[],
  ignoredTopics: IgnoredTopic[]
): TelegramMentionsCheckerNotificationResult[] => {
  const data: TelegramMentionsCheckerNotificationResult[] = [];

  for (const user of users) {
    try {
      if (!user.username || !isUserMentionedInPost(post, user)) continue;
      if (!shouldNotifyUser(post, user, ignoredUsers, ignoredTopics)) continue;

      data.push({
        userId: user.id,
        type: NotificationType.POST_MENTION,
        metadata: { post, user, history: false }
      });
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
}: TelegramMentionsCheckerParams): Promise<TelegramMentionsCheckerNotificationResult[]> => {
  const data: TelegramMentionsCheckerNotificationResult[] = [];

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
