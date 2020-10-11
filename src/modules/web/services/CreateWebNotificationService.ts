import { inject, injectable } from 'tsyringe';

import ICreateWebNotificationDTO from '../dtos/ICreateWebNotificationDTO';

import WebNotification from '../infra/typeorm/entities/WebNotification';
import IWebNotificationsRepository from '../repositories/IWebNotificationsRepository';

@injectable()
export default class CreateWebNotificationService {
  constructor(
    @inject('WebNotificationsRepository')
    private webNotificationsRepository: IWebNotificationsRepository,
  ) {}

  public async execute(
    data: ICreateWebNotificationDTO,
  ): Promise<WebNotification> {
    const webNotification = this.webNotificationsRepository.create(data);

    await this.webNotificationsRepository.save(webNotification);

    return webNotification;
  }
}
