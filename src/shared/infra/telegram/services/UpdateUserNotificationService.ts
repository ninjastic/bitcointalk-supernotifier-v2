import { injectable, inject } from 'tsyringe';
import User from '../../../../modules/users/infra/typeorm/entities/User';

import IUsersRepository from '../../../../modules/users/repositories/IUsersRepository';

type NotificationType = 'mentions' | 'merits' | 'modlogs' | 'track_topics' | 'onlyDirectMentions';

@injectable()
export default class UpdateUserNotificationService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  public async execute(telegram_id: string, type: NotificationType, value: boolean): Promise<User> {
    const user = await this.usersRepository.findByTelegramId(telegram_id);

    if (type === 'mentions') {
      user.enable_mentions = value;
    } else if (type === 'merits') {
      user.enable_merits = value;
    } else if (type === 'modlogs') {
      user.enable_modlogs = value;
    } else if (type === 'track_topics') {
      user.enable_auto_track_topics = value;
    } else if (type === 'onlyDirectMentions') {
      user.enable_only_direct_mentions = value;
    }

    await this.usersRepository.save(user);

    return user;
  }
}
