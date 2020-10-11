import { getRepository, Repository } from 'typeorm';

import WebNotification from '../entities/WebNotification';

import ICreateWebNotificationDTO from '../../../dtos/ICreateWebNotificationDTO';

import IWebNotificationsRepository from '../../../repositories/IWebNotificationsRepository';

export default class WebNotificationsRepository
  implements IWebNotificationsRepository {
  private ormRepository: Repository<WebNotification>;

  constructor() {
    this.ormRepository = getRepository(WebNotification);
  }

  public create(data: ICreateWebNotificationDTO): WebNotification {
    return this.ormRepository.create(data);
  }

  public async save(
    webNotification: WebNotification,
  ): Promise<WebNotification> {
    return this.ormRepository.save(webNotification);
  }

  public async findOneByUsername(
    username: string,
  ): Promise<WebNotification | undefined> {
    return this.ormRepository.findOne({
      where: {
        username: username.toLowerCase(),
      },
      relations: ['post', 'merit'],
    });
  }

  public async findAll(): Promise<WebNotification[]> {
    return this.ormRepository.find({
      relations: ['post', 'merit'],
    });
  }

  public async findAllByUserId(user_id: string): Promise<WebNotification[]> {
    return this.ormRepository.find({
      where: {
        user_id,
      },
      relations: ['post', 'merit'],
      order: {
        created_at: 'DESC',
      },
    });
  }
}
