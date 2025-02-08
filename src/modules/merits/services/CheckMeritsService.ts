import { inject, injectable } from 'tsyringe';
import { getRepository } from 'typeorm';

import logger from '../../../shared/services/logger';
import { addTelegramJob } from '../../../shared/infra/bull/queues/telegramQueue';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IMeritsRepository from '../repositories/IMeritsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';
import { MeritNotification, NotificationType } from '../../notifications/infra/typeorm/entities/Notification';

@injectable()
export default class CheckMeritsService {
  constructor(
    @inject('MeritsRepository')
    private meritsRepository: IMeritsRepository,

    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(): Promise<void> {
    const merits = await this.meritsRepository.getLatestUncheckedMerits();
    const users = await this.usersRepository.getUsersWithMerits();

    const notificationRepository = getRepository(MeritNotification);

    for await (const merit of merits) {
      const receiverUsers = users.filter(user => user.user_id === merit.receiver_uid);

      if (!receiverUsers.length) {
        continue;
      }

      for await (const receiverUser of receiverUsers) {
        const meritUserKey = `CheckMeritsService:${receiverUser.telegram_id}:${merit.id}`;
        const notificationData = {
          telegram_id: receiverUser.telegram_id,
          type: NotificationType.MERIT,
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

        const isJobAlreadyInQueue = await this.cacheRepository.recover(meritUserKey);
        if (isJobAlreadyInQueue) continue;

        const redisAnswer = await this.cacheRepository.save(meritUserKey, true, 'EX', 1800);
        if (redisAnswer !== 'OK') {
          logger.error({ meritUserKey, redisAnswer }, 'CheckMeritsService Job lock did not return OK');
          continue;
        }

        await addTelegramJob('sendMeritNotification', { merit, user: receiverUser });
      }
    }

    for await (const merit of merits) {
      merit.checked = true;
      await this.meritsRepository.save(merit);
    }
  }
}
