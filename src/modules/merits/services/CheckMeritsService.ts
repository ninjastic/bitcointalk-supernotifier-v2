import { container, inject, injectable } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import IMeritsRepository from '../repositories/IMeritsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';
import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';

import SetMeritCheckedService from './SetMeritCheckedService';

@injectable()
export default class CheckMeritsService {
  constructor(
    @inject('MeritsRepository')
    private meritsRepository: IMeritsRepository,

    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    @inject('CacheRepository')
    private cacheProvider: ICacheProvider,
  ) {}

  public async execute(): Promise<void> {
    const merits = await this.meritsRepository.getLatestUncheckedMerits(20);
    const users = await this.usersRepository.getUsersWithMerits();

    const setMeritChecked = container.resolve(SetMeritCheckedService);

    const queue = new Queue('TelegramQueue', {
      redis: cacheConfig.config.redis,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
    });

    await Promise.all(
      merits.map(async merit => {
        Promise.all(
          users.map(async user => {
            if (
              merit.receiver_uid !== user.user_id &&
              merit.receiver !== user.username
            ) {
              return Promise.resolve();
            }

            if (merit.notified_to.includes(user.telegram_id)) {
              return Promise.resolve();
            }

            const meritNotified = await this.cacheProvider.recover<boolean>(
              `notified:${merit.date}-${merit.amount}-${merit.post_id}`,
            );

            if (meritNotified) {
              return Promise.resolve();
            }

            await this.cacheProvider.save(
              `notified:${merit.date}-${merit.amount}-${merit.post_id}`,
              true,
              'EX',
              180,
            );

            return queue.add('sendMeritNotification', { merit, user });
          }),
        );

        return setMeritChecked.execute({
          amount: merit.amount,
          date: merit.date,
          post_id: merit.post_id,
        });
      }),
    );

    await queue.close();
  }
}
