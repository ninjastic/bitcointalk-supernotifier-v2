import { inject, injectable } from 'tsyringe';

import IWebNotificationsRepository from '../repositories/IWebNotificationsRepository';

interface Data {
  id: string;
  user_id: string;
  type: string;
  post_id: number;
  merit_id: string;
  post: any;
  merit: any;
  created_at: Date;
  updated_at: Date;
}

@injectable()
export default class GetWebUserService {
  constructor(
    @inject('WebNotificationsRepository')
    private webNotificationsRepository: IWebNotificationsRepository
  ) {}

  public async execute(user_id: string): Promise<Data[]> {
    const webNotifications = await this.webNotificationsRepository.findAllByUserId(user_id);

    const data = webNotifications.map(webNotification => {
      const { post, merit } = webNotification;

      if (post) {
        delete post.boards;
        delete post.notified;
        delete post.notified_to;
        delete post.checked;
        delete post.archive;
      }

      if (merit) {
        delete merit.notified;
        delete merit.notified_to;
        delete merit.checked;

        if (merit.post) {
          delete merit.post.boards;
          delete merit.post.notified;
          delete merit.post.notified_to;
          delete merit.post.checked;
          delete merit.post.archive;
        }
      }

      return {
        id: webNotification.id,
        user_id: webNotification.user_id,
        type: webNotification.merit ? 'merit' : 'post',
        post_id: webNotification.post_id,
        merit_id: webNotification.merit_id,
        post,
        merit,
        created_at: webNotification.created_at,
        updated_at: webNotification.updated_at
      };
    });

    return data;
  }
}
