import type { FindOneOptions, Repository } from 'typeorm';

import { getRepository } from 'typeorm';

import type { CreateNotificationDTO } from '../dtos/CreateNotificationDTO';

import Notification from '../entities/Notification';

export default class NotificationRepository {
  private ormRepository: Repository<Notification>;

  constructor() {
    this.ormRepository = getRepository(Notification<object>);
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
