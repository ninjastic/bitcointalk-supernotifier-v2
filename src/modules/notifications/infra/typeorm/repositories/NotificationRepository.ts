import { FindOneOptions, Repository, getRepository } from 'typeorm';

import Notification from '../entities/Notification';
import { CreateNotificationDTO } from '../dtos/CreateNotificationDTO';

export default class NotificationRepository {
  private ormRepository: Repository<Notification>;

  constructor() {
    this.ormRepository = getRepository(Notification);
  }

  public create(notification: CreateNotificationDTO): Notification {
    return this.ormRepository.create(notification);
  }

  public async save(notification: Notification): Promise<Notification> {
    return this.ormRepository.save(notification);
  }

  public async findOne(notification: FindOneOptions<Notification>): Promise<Notification | undefined> {
    return this.ormRepository.findOne(notification);
  }
}
