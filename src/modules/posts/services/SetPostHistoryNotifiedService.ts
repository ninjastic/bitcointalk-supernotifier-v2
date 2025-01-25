import { inject, injectable } from 'tsyringe';

import { NotificationType, PostMentionNotification } from '@/modules/notifications/infra/typeorm/entities/Notification';
import IPostsHistoryRepository from '../repositories/IPostsHistoryRepository';
import { NotificationService } from './notification-service';

@injectable()
export default class SetPostHistoryNotifiedService {
  constructor(
    @inject('PostsHistoryRepository')
    private postsHistoryRepository: IPostsHistoryRepository
  ) {}

  public async execute(post_id: number, telegram_id: string): Promise<void> {
    const notificationService = new NotificationService();
    const postHistory = await this.postsHistoryRepository.findOne({
      post_id,
      version: 1
    });

    postHistory.notified = true;
    postHistory.notified_to.push(telegram_id);

    await this.postsHistoryRepository.save(postHistory);

    await notificationService.createNotification<PostMentionNotification>({
      type: NotificationType.POST_MENTION,
      telegram_id,
      metadata: {
        post_id,
        history: true
      }
    });
  }
}
