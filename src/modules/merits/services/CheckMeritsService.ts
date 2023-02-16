import { container, inject, injectable } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import IMeritsRepository from '../repositories/IMeritsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';
import IWebUsersRepository from '../../web/repositories/IWebUsersRepository';
import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';

import SetMeritCheckedService from './SetMeritCheckedService';
import CreateWebNotificationService from '../../web/services/CreateWebNotificationService';

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
    private cacheProvider: ICacheProvider,
  ) {}

  public async execute(): Promise<void> {
    const merits = await this.meritsRepository.getLatestUncheckedMerits(20);
    const webUsers = await this.webUsersRepository.findAll();
    const users = await this.usersRepository.getUsersWithMerits();

    const setMeritChecked = container.resolve(SetMeritCheckedService);
    const createWebNotification = container.resolve(
      CreateWebNotificationService,
    );

    const queue = new Queue('TelegramQueue', {
      redis: cacheConfig.config.redis,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
      limiter: {
        max: 1,
        duration: 900,
      },
    });

    await Promise.all(
      merits.map(async merit => {
        await setMeritChecked.execute({
          amount: merit.amount,
          date: merit.date,
          post_id: merit.post_id,
          sender_uid: merit.sender_uid,
        });

        await Promise.all(
          users.map(async user => {
            if (merit.receiver_uid !== user.user_id) {
              return Promise.resolve();
            }

            if (merit.notified_to.includes(Number(user.telegram_id))) {
              return Promise.resolve();
            }

            const meritNotified = await this.cacheProvider.recover<boolean>(
              `notified:${merit.date}_${merit.amount}_${merit.post_id}_${merit.sender_uid}`,
            );

            if (meritNotified) {
              return Promise.resolve();
            }

            await this.cacheProvider.save(
              `notified:${merit.date}_${merit.amount}_${merit.post_id}_${merit.sender_uid}`,
              true,
              'EX',
              180,
            );

            return queue.add('sendMeritNotification', { merit, user });
          }),
        );
      }),
    );

    await Promise.all(
      merits.map(async merit => {
        await Promise.all(
          webUsers.map(async webUser => {
            if (merit.receiver_uid !== webUser.user_id) {
              return Promise.resolve();
            }

            return createWebNotification.execute({
              user_id: webUser.id,
              merit_id: merit.id,
            });
          }),
        );
      }),
    );

    await queue.close();
  }
}
