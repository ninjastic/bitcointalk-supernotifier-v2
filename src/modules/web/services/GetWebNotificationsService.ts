import { inject, injectable } from 'tsyringe';

import WebNotification from '../infra/typeorm/entities/WebNotification';

import IWebNotificationsRepository from '../repositories/IWebNotificationsRepository';

@injectable()
export default class GetWebUserService {
  constructor(
    @inject('WebNotificationsRepository')
    private webNotificationsRepository: IWebNotificationsRepository,
  ) {}

  public async execute(user_id: string): Promise<WebNotification[]> {
    const webNotifications = this.webNotificationsRepository.findAllByUserId(
      user_id,
    );

    return webNotifications;
  }
}
