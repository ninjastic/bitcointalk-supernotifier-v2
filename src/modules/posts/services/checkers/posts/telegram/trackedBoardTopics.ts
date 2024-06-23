import Topic from '../../../../infra/typeorm/entities/Topic';
import TrackedBoard from '../../../../infra/typeorm/entities/TrackedBoard';
import IgnoredUser from '../../../../../users/infra/typeorm/entities/IgnoredUser';
import { RecipeData } from '../../../../../../shared/infra/bull/types/telegram';

type TelegramTrackedBoardTopicsCheckerNotificationData = {
  userId: string;
  type: 'tracked_board';
  metadata: RecipeData['sendTrackedBoardNotification'];
};

export const telegramTrackedBoardTopicsChecker = async (
  topic: Topic,
  trackedBoards: TrackedBoard[],
  ignoredUsers: IgnoredUser[]
): Promise<TelegramTrackedBoardTopicsCheckerNotificationData[]> => {
  const data: TelegramTrackedBoardTopicsCheckerNotificationData[] = [];

  const trackedBoardsWithMatchingTopics = trackedBoards.filter(
    trackedBoard => trackedBoard.board_id === topic.post.board_id
  );

  for await (const trackedBoard of trackedBoardsWithMatchingTopics) {
    const { user } = trackedBoard;
    const { post } = topic;

    const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
    const isSameUid = user.user_id && post.author_uid === user.user_id;
    const isAlreadyNotified = post.notified_to.includes(user.telegram_id);

    const isAuthorIgnored = ignoredUsers
      .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
      ?.ignoring.includes(user.telegram_id);

    if (isSameUsername || isSameUid || isAlreadyNotified || isAuthorIgnored) {
      continue;
    }

    data.push({
      userId: user.id,
      type: 'tracked_board',
      metadata: { post, user, trackedBoard }
    });
  }

  return data;
};
