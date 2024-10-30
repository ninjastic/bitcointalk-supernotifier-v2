import { inject, injectable } from 'tsyringe';

import IPostsRepository from '../repositories/IPostsRepository';
import NotificationRepository from '../../notifications/infra/typeorm/repositories/NotificationRepository';

@injectable()
export default class SetPostNotifiedService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository
  ) {}

  public async execute(post_id: number, telegram_id: string): Promise<void> {
    const post = await this.postsRepository.findOneByPostId(post_id);
    const notificationRepository = new NotificationRepository();

    post.notified = true;
    post.notified_to.push(telegram_id);

    await this.postsRepository.save(post);

    const notificationData = {
      telegram_id,
      type: 'post_mention',
      metadata: { post_id }
    };

    const notification = notificationRepository.create(notificationData);
    await notificationRepository.save(notification);
  }
}
