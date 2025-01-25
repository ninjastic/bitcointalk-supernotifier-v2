import { NotificationType } from '@/modules/notifications/infra/typeorm/entities/Notification';

export interface CreateNotificationDTO {
  telegram_id: string;
  type: NotificationType;
  metadata: object;
}
