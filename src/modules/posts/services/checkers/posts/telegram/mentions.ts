import type IgnoredBoard from '##/modules/posts/infra/typeorm/entities/IgnoredBoard';

import {
  isUserMentionedInPreparedContent,
  shouldNotifyUserWithIndex,
} from '##/shared/services/utils';

import type {
  NotificationResult,
  RecipeMetadata,
} from '../../../../../../shared/infra/bull/types/telegram';
import type IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import type User from '../../../../../users/infra/typeorm/entities/User';
import type IgnoredTopic from '../../../../infra/typeorm/entities/IgnoredTopic';
import type { PreparedCheckerPost } from './prepared-checker-data';

import logger from '../../../../../../shared/services/logger';
import { createNotificationIgnoreIndex } from '../../../../../../shared/services/utils';
import { NotificationType } from '../../../../../notifications/infra/typeorm/entities/Notification';

type TelegramMentionsCheckerNotificationResult = NotificationResult<
  RecipeMetadata['sendMentionNotification']
>;

interface TelegramMentionsCheckerParams {
  posts: PreparedCheckerPost[];
  postsVersions: PreparedCheckerPost[];
  users: User[];
  ignoredUsers: IgnoredUser[];
  ignoredTopics: IgnoredTopic[];
  ignoredBoards: IgnoredBoard[];
}

function processPost(
  preparedPost: PreparedCheckerPost,
  users: User[],
  ignoredIndex: ReturnType<typeof createNotificationIgnoreIndex>,
): TelegramMentionsCheckerNotificationResult[] {
  const data: TelegramMentionsCheckerNotificationResult[] = [];
  const { post, preparedMentionContent } = preparedPost;

  for (const user of users) {
    try {
      const { isMentioned, mentionType } = isUserMentionedInPreparedContent(
        preparedMentionContent,
        user,
        user.enable_only_direct_mentions,
      );
      if (!user.username || !isMentioned) continue;
      if (!shouldNotifyUserWithIndex(post, user, ignoredIndex)) continue;

      data.push({
        userId: user.id,
        type: NotificationType.POST_MENTION,
        metadata: { post, user, history: false, mentionType },
      });
    } catch (error) {
      logger.error(
        { error, postId: post.post_id, telegramId: user.telegram_id },
        `Error processing user ${user.telegram_id} for post ${post.post_id}`,
      );
    }
  }

  return data;
}

export async function telegramMentionsChecker({
  posts,
  postsVersions,
  users,
  ignoredUsers,
  ignoredTopics,
  ignoredBoards,
}: TelegramMentionsCheckerParams): Promise<TelegramMentionsCheckerNotificationResult[]> {
  const data: TelegramMentionsCheckerNotificationResult[] = [];
  const ignoredIndex = createNotificationIgnoreIndex(ignoredUsers, ignoredTopics, ignoredBoards);

  for (const post of posts) {
    try {
      const notifications = processPost(post, users, ignoredIndex);
      data.push(...notifications);
    } catch (error) {
      logger.error(
        { error, postId: post.post.post_id },
        `Error processing post ${post.post.post_id}`,
      );
    }
  }

  for (const postVersion of postsVersions) {
    try {
      const notifications = processPost(postVersion, users, ignoredIndex);
      data.push(...notifications);
    } catch (error) {
      logger.error(
        { error, postId: postVersion.post.post_id },
        `Error processing post version ${postVersion.post.post_id}`,
      );
    }
  }

  return data;
}
