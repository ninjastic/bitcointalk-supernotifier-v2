import { container, inject, injectable } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import IMeritsRepository from '../repositories/IMeritsRepository';
import IUsersRepository from '../../users/repositories/IUsersRepository';

import SetMeritCheckedService from './SetMeritCheckedService';

@injectable()
export default class CheckMeritsService {
  constructor(
    @inject('MeritsRepository')
    private meritsRepository: IMeritsRepository,

    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
  ) {}

  public async execute(): Promise<void> {
    const merits = await this.meritsRepository.getLatestUncheckedMerits(20);
    const users = await this.usersRepository.getUsersWithMerits();

    const setMeritChecked = container.resolve(SetMeritCheckedService);

    const queue = new Queue('telegramNotifications', {
      redis: cacheConfig.config.redis,
    });

    Promise.all(
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
  }
}
