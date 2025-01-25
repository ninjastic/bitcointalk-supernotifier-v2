import Notification from '@/modules/notifications/infra/typeorm/entities/Notification';
import { DeepPartial, getRepository, Repository } from 'typeorm';

export class NotificationService {
  private notificationRepository: Repository<Notification> = getRepository(Notification<object>);

  async createNotification<T extends Notification>(notificationData: DeepPartial<T>): Promise<void> {
    const notification = this.notificationRepository.create(notificationData);
    await this.notificationRepository.save(notification);
  }
}
