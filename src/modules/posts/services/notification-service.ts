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
}
