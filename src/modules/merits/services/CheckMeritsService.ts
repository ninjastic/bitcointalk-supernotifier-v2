import { container, inject, injectable } from 'tsyringe';

import IMeritsRepository from '../repositories/IMeritsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';
import IWebUsersRepository from '../../web/repositories/IWebUsersRepository';
import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';

import SetMeritCheckedService from './SetMeritCheckedService';
import CreateWebNotificationService from '../../web/services/CreateWebNotificationService';
import telegramQueue from '../../../shared/infra/bull/queues/telegramQueue';

@injectable()
export default class CheckMeritsService {
  constructor(
    @inject('MeritsRepository')
    private meritsRepository: IMeritsRepository,

    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    @inject('WebUsersRepository')
    private webUsersRepository: IWebUsersRepository,

    @inject('CacheRepository')
    private cacheProvider: ICacheProvider
  ) {}

  public async execute(): Promise<void> {
    const merits = await this.meritsRepository.getLatestUncheckedMerits();
    const webUsers = await this.webUsersRepository.findAll();
    const users = await this.usersRepository.getUsersWithMerits();

    const setMeritChecked = container.resolve(SetMeritCheckedService);
    const createWebNotification = container.resolve(CreateWebNotificationService);

    for await (const merit of merits) {
      await setMeritChecked.execute({
        amount: merit.amount,
        date: merit.date,
        post_id: merit.post_id,
        sender_uid: merit.sender_uid
      });

      for await (const user of users) {
        const isNotReceiverUid = merit.receiver_uid !== user.user_id;
        const isAlreadyNotified =
          merit.notified_to.includes(user.telegram_id) ||
          (await this.cacheProvider.recover<boolean>(
            `notified:${merit.date}_${merit.amount}_${merit.post_id}_${merit.sender_uid}`
          ));

        if (isNotReceiverUid || isAlreadyNotified) {
          continue;
        }

        await this.cacheProvider.save(
          `notified:${merit.date}_${merit.amount}_${merit.post_id}_${merit.sender_uid}`,
          true,
          'EX',
          180
        );

        await telegramQueue.add('sendMeritNotification', { merit, user });
      }
    }

    for await (const merit of merits) {
      for await (const webUser of webUsers) {
        if (merit.receiver_uid !== webUser.user_id) {
          continue;
        }

        createWebNotification.execute({
          user_id: webUser.id,
          merit_id: merit.id
        });
      }
    }
  }
}
