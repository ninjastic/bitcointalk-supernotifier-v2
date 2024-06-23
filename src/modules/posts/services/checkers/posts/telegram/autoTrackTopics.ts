import Topic from '../../../../infra/typeorm/entities/Topic';
import User from '../../../../../users/infra/typeorm/entities/User';

type TelegramAutoTrackTopicsCheckerNotificationData = {
  userId: string;
  type: 'auto_track_topic_request';
  metadata: { topic: number };
};

export const telegramAutoTrackTopicsChecker = async (
  topic: Topic,
  users: User[]
): Promise<TelegramAutoTrackTopicsCheckerNotificationData[]> => {
  const data: TelegramAutoTrackTopicsCheckerNotificationData[] = [];

  const usersWithAutoTrackTopicsAndMatchingTopic = users.filter(
    user => user.enable_auto_track_topics && topic.post.author_uid === user.user_id
  );

  for await (const user of usersWithAutoTrackTopicsAndMatchingTopic) {
    const isAlreadyNotified = topic.post.notified_to.includes(user.telegram_id);

    if (isAlreadyNotified) {
      continue;
    }

    data.push({
      userId: user.id,
      type: 'auto_track_topic_request',
      metadata: { topic: topic.topic_id }
    });
  }

  return data;
};
