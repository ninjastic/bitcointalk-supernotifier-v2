import type { Repository } from 'typeorm';
import { getRepository } from 'typeorm';
import hat from 'hat';

import NotificationApiKey from '../entities/NotificationApiKey';
import type CreateNotificationApiKeyDTO from '../../../dtos/CreateNotificationApiKeyDTO';
import type FindOneNotificationApiKeyDTO from '../../../dtos/FindOneNotificationApiKeyDTO';

export default class NotificationApiKeyRepository {
  private ormRepository: Repository<NotificationApiKey>;

  constructor() {
    this.ormRepository = getRepository(NotificationApiKey);
  }

  public create(data: CreateNotificationApiKeyDTO): NotificationApiKey {
    return this.ormRepository.create({
      api_key: hat(),
      telegram_id: data.telegram_id
    });
  }

  public async save(data: NotificationApiKey): Promise<NotificationApiKey> {
    return this.ormRepository.save(data);
  }

  public async findOne(data: FindOneNotificationApiKeyDTO): Promise<NotificationApiKey | undefined> {
    return this.ormRepository.findOne({ where: data, relations: ['user'] });
  }
}
