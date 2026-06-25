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
import type { PreparedAdvancedMatch } from './prepared-checker-data';

import logger from '../../../../../../shared/services/logger';

type TelegramAdvancedMatchesCheckerNotificationResult = NotificationResult<
  RecipeMetadata['sendAdvancedMatchNotification']
>;

interface TelegramAdvancedMatchesCheckerParams {
  posts: Post[];
  advancedMatches: PreparedAdvancedMatch[];
  ignoredUsers: IgnoredUser[];
  ignoredTopics: IgnoredTopic[];
  ignoredBoards: IgnoredBoard[];
}

function matchesRegex(value: string, expression: RegExp | null): boolean {
  if (!expression) return true;
  return expression.test(value);
}

function isAdvancedMatchInPost(post: Post, prepared: PreparedAdvancedMatch): boolean {
  const { advancedMatch } = prepared;

  if (!matchesRegex(post.title, prepared.titleExpression)) return false;
  if (!matchesRegex(post.content, prepared.contentExpression)) return false;

  if (advancedMatch.authors?.length) {
    if (!advancedMatch.authors.some((a) => post.author.toLowerCase() === a.author.toLowerCase()))
      return false;
  }

  if (advancedMatch.boards?.length) {
    if (!advancedMatch.boards.some((b) => post.board_id === b.board_id)) return false;
  }

  if (advancedMatch.topics?.length) {
    if (!advancedMatch.topics.some((t) => post.topic_id === t.topic_id)) return false;
  }

  return true;
}

function processPost(
  post: Post,
  advancedMatches: PreparedAdvancedMatch[],
  ignoredIndex: ReturnType<typeof createNotificationIgnoreIndex>,
): TelegramAdvancedMatchesCheckerNotificationResult[] {
  const data: TelegramAdvancedMatchesCheckerNotificationResult[] = [];

  for (const prepared of advancedMatches) {
    try {
      const { user } = prepared.advancedMatch;

      if (!isAdvancedMatchInPost(post, prepared)) continue;
      if (!shouldNotifyUserWithIndex(post, user, ignoredIndex)) continue;

      data.push({
        userId: user.id,
        type: NotificationType.ADVANCED_MATCH,
        metadata: { post, user, advancedMatch: prepared.advancedMatch },
      });
    } catch (error) {
      logger.error(
        { error, postId: post.post_id, telegramId: prepared.advancedMatch.user.telegram_id },
        `Error processing advanced match ${prepared.advancedMatch.id} for post ${post.post_id}`,
      );
    }
  }

  return data;
}

export async function telegramAdvancedMatchesChecker({
  posts,
  advancedMatches,
  ignoredUsers,
  ignoredTopics,
  ignoredBoards,
}: TelegramAdvancedMatchesCheckerParams): Promise<
  TelegramAdvancedMatchesCheckerNotificationResult[]
> {
  const data: TelegramAdvancedMatchesCheckerNotificationResult[] = [];
  const ignoredIndex = createNotificationIgnoreIndex(ignoredUsers, ignoredTopics, ignoredBoards);

  for (const post of posts) {
    try {
      const notifications = processPost(post, advancedMatches, ignoredIndex);
      data.push(...notifications);
    } catch (error) {
      logger.error({ error, postId: post.post_id }, `Error processing post ${post.post_id}`);
    }
  }

  return data;
}
