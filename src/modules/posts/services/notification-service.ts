import Notification, {
  AutoTrackTopicRequestNotification,
  MeritNotification,
  NotificationType,
  PostMentionNotification,
  RemoveTopicNotification,
  TrackedBoardNotification,
  TrackedPhraseNotification,
  TrackedTopicNotification,
  TrackedUserNotification
} from '##/modules/notifications/infra/typeorm/entities/Notification';
import { DeepPartial, getRepository, Repository } from 'typeorm';

type FindOneNotificationConditions<T extends Notification> = {
  type: T['type'];
  telegram_id: string;
  metadata: Record<string, any>;
};

export class NotificationService {
  private notificationRepositoryClassMap = {
    [NotificationType.POST_MENTION]: PostMentionNotification,
    [NotificationType.MERIT]: MeritNotification,
    [NotificationType.TRACKED_TOPIC]: TrackedTopicNotification,
    [NotificationType.TRACKED_BOARD]: TrackedBoardNotification,
    [NotificationType.TRACKED_USER]: TrackedUserNotification,
    [NotificationType.TRACKED_PHRASE]: TrackedPhraseNotification,
    [NotificationType.AUTO_TRACK_TOPIC_REQUEST]: AutoTrackTopicRequestNotification,
    [NotificationType.REMOVE_TOPIC]: RemoveTopicNotification
  };

  private getTypeRepository(type: NotificationType) {
    const NotificationClass = this.notificationRepositoryClassMap[type];

    if (!NotificationClass) {
      throw new Error(`Invalid notification type: ${type}`);
    }

    return NotificationClass;
  }

  async createNotification<T extends Notification>(notificationData: DeepPartial<T>): Promise<Notification> {
    const repository = this.getTypeRepository(notificationData.type as unknown as NotificationType);
    const notificationRepository: Repository<Notification> = getRepository(repository);
    const notification = notificationRepository.create(notificationData);
    await notificationRepository.save(notification);
    return notification;
  }

  async findOne<T extends Notification>(conditions: FindOneNotificationConditions<T>): Promise<T> {
    const repository = this.getTypeRepository(conditions.type as unknown as NotificationType);
    const notificationRepository: Repository<Notification> = getRepository(repository);

    const queryBuilder = notificationRepository
      .createQueryBuilder('notification')
      .where('notification.type = :type', { type: conditions.type })
      .andWhere('notification.telegram_id = :telegramId', { telegramId: conditions.telegram_id });

    Object.entries(conditions.metadata).forEach(([key, value]) => {
      queryBuilder.andWhere(`notification.metadata->>'${key}' = :${key}`, {
        [key]: value.toString()
      });
    });

    const notification = await queryBuilder.getOne();

    return notification as T;
  }
}
