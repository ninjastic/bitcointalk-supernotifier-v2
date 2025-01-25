import { inject, injectable } from 'tsyringe';

import { NotificationType, PostMentionNotification } from '@/modules/notifications/infra/typeorm/entities/Notification';
import IPostsRepository from '../repositories/IPostsRepository';
import { NotificationService } from './notification-service';

@injectable()
export default class SetPostNotifiedService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository
  ) {}

  public async execute(post_id: number, telegram_id: string): Promise<void> {
    const post = await this.postsRepository.findOneByPostId(post_id);
    const notificationService = new NotificationService();

    post.notified = true;
    post.notified_to.push(telegram_id);

    await this.postsRepository.save(post);

    await notificationService.createNotification<PostMentionNotification>({
      type: NotificationType.POST_MENTION,
      telegram_id,
      metadata: {
        post_id,
        history: false
      }
    });
  }
}
