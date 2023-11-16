import { inject, injectable } from 'tsyringe';

import { addTelegramJob } from '../../../shared/infra/bull/queues/telegramQueue';

import IMeritsRepository from '../repositories/IMeritsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';
import NotificationRepository from '../../notifications/infra/typeorm/repositories/NotificationRepository';

@injectable()
export default class CheckMeritsService {
  constructor(
    @inject('MeritsRepository')
    private meritsRepository: IMeritsRepository,

    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  public async execute(): Promise<void> {
    const merits = await this.meritsRepository.getLatestUncheckedMerits();
    const users = await this.usersRepository.getUsersWithMerits();

    const notificationRepository = new NotificationRepository();

    for await (const merit of merits) {
      const receiverUsers = users.filter(user => user.user_id === merit.receiver_uid);

      if (!receiverUsers.length) {
        continue;
      }

      for await (const receiverUser of receiverUsers) {
        const notificationData = {
          telegram_id: receiverUser.telegram_id,
          type: 'merit',
          metadata: {
            post_id: merit.post_id,
            merit_id: merit.id
          }
        };

        const isAlreadyNotified =
          merit.notified_to.includes(receiverUser.telegram_id) ||
          (await notificationRepository.findOne({ where: notificationData }));

        if (isAlreadyNotified) {
          continue;
        }

        const notification = notificationRepository.create(notificationData);
        await notificationRepository.save(notification);

        await addTelegramJob('sendMeritNotification', { merit, user: receiverUser });
      }
    }

    for await (const merit of merits) {
      merit.checked = true;
      await this.meritsRepository.save(merit);
    }
  }
}
