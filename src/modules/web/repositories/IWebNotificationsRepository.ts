import WebNotification from '../infra/typeorm/entities/WebNotification';

import ICreateWebNotificationDTO from '../dtos/ICreateWebNotificationDTO';

export default interface IWebNotificationsRepository {
  create(data: ICreateWebNotificationDTO): WebNotification;
  save(data: WebNotification): Promise<WebNotification>;
  findAllByUserId(user_id: string): Promise<WebNotification[]>;
}
