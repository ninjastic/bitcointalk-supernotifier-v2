import { inject, injectable } from 'tsyringe';

import IPostsHistoryRepository from '../repositories/IPostsHistoryRepository';
import NotificationRepository from '../../notifications/infra/typeorm/repositories/NotificationRepository';

@injectable()
export default class SetPostHistoryNotifiedService {
  constructor(
    @inject('PostsHistoryRepository')
    private postsHistoryRepository: IPostsHistoryRepository
  ) {}

  public async execute(post_id: number, telegram_id: string): Promise<void> {
    const notificationRepository = new NotificationRepository();
    const postHistory = await this.postsHistoryRepository.findOne({
      post_id,
      version: 1
    });

    postHistory.notified = true;
    postHistory.notified_to.push(telegram_id);

    await this.postsHistoryRepository.save(postHistory);

    const notificationData = {
      telegram_id,
      type: 'post_mention',
      metadata: { post_id }
    };

    const notification = notificationRepository.create(notificationData);
    await notificationRepository.save(notification);
  }
}
