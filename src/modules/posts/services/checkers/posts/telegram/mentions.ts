import { isUserMentionedInPost, shouldNotifyUser } from '##/shared/services/utils';
import logger from '../../../../../../shared/services/logger';
import Post from '../../../../infra/typeorm/entities/Post';
import User from '../../../../../users/infra/typeorm/entities/User';
import IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import IgnoredTopic from '../../../../infra/typeorm/entities/IgnoredTopic';
import { NotificationResult, RecipeMetadata } from '../../../../../../shared/infra/bull/types/telegram';
import { NotificationType } from '../../../../../notifications/infra/typeorm/entities/Notification';
import PostVersion from '##/modules/posts/infra/typeorm/entities/PostVersion';
import IgnoredBoard from '##/modules/posts/infra/typeorm/entities/IgnoredBoard';

type TelegramMentionsCheckerNotificationResult = NotificationResult<RecipeMetadata['sendMentionNotification']>;

type TelegramMentionsCheckerParams = {
  posts: Post[];
  postsVersions: PostVersion[];
  users: User[];
  ignoredUsers: IgnoredUser[];
  ignoredTopics: IgnoredTopic[];
  ignoredBoards: IgnoredBoard[];
};

const processPost = (
  post: Post,
  users: User[],
  ignoredUsers: IgnoredUser[],
  ignoredTopics: IgnoredTopic[],
  ignoredBoards: IgnoredBoard[]
): TelegramMentionsCheckerNotificationResult[] => {
  const data: TelegramMentionsCheckerNotificationResult[] = [];

  for (const user of users) {
    try {
      if (!user.username || !isUserMentionedInPost(post.content, user, user.enable_only_direct_mentions)) continue;
      if (!shouldNotifyUser(post, user, ignoredUsers, ignoredTopics, ignoredBoards)) continue;

      data.push({
        userId: user.id,
        type: NotificationType.POST_MENTION,
        metadata: { post, user, history: false }
      });
    } catch (error) {
      logger.error(
        { error, postId: post.post_id, telegramId: user.telegram_id },
        `Error processing user ${user.telegram_id} for post ${post.post_id}`
      );
    }
  }

  return data;
};

const processPostVersion = (
  postVersion: PostVersion,
  users: User[],
  ignoredUsers: IgnoredUser[],
  ignoredTopics: IgnoredTopic[],
  ignoredBoards: IgnoredBoard[]
): TelegramMentionsCheckerNotificationResult[] => {
  const data: TelegramMentionsCheckerNotificationResult[] = [];
  const postWithNewContent = {
    ...postVersion.post,
    content: postVersion.new_content,
    title: postVersion.new_title ?? postVersion.post.title
  };

  for (const user of users) {
    try {
      if (!user.username || !isUserMentionedInPost(postVersion.new_content, user, user.enable_only_direct_mentions)) continue;
      if (!shouldNotifyUser(postWithNewContent, user, ignoredUsers, ignoredTopics, ignoredBoards)) continue;

      data.push({
        userId: user.id,
        type: NotificationType.POST_MENTION,
        metadata: { post: postWithNewContent, user, history: false }
      });
    } catch (error) {
      logger.error(
        { error, postId: postWithNewContent.post_id, telegramId: user.telegram_id },
        `Error processing user ${user.telegram_id} for post ${postWithNewContent.post_id}`
      );
    }
  }

  return data;
};

export const telegramMentionsChecker = async ({
  posts,
  postsVersions,
  users,
  ignoredUsers,
  ignoredTopics,
  ignoredBoards
}: TelegramMentionsCheckerParams): Promise<TelegramMentionsCheckerNotificationResult[]> => {
  const data: TelegramMentionsCheckerNotificationResult[] = [];

  for (const post of posts) {
    try {
      const notifications = processPost(post, users, ignoredUsers, ignoredTopics, ignoredBoards);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, postId: post.post_id }, `Error processing post ${post.post_id}`);
    }
  }

  for (const postVersion of postsVersions) {
    try {
      const notifications = processPostVersion(postVersion, users, ignoredUsers, ignoredTopics, ignoredBoards);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, postVersionId: postVersion.id }, `Error processing post version ${postVersion.id}`);
    }
  }

  return data;
};
