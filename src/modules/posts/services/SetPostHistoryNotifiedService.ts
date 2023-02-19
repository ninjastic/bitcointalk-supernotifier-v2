import { inject, injectable } from 'tsyringe';

import IPostsHistoryRepository from '../repositories/IPostsHistoryRepository';

@injectable()
export default class SetPostHistoryNotifiedService {
  constructor(
    @inject('PostsHistoryRepository')
    private postsHistoryRepository: IPostsHistoryRepository
  ) {}

  public async execute(post_id: number, telegram_id: number): Promise<void> {
    const postHistory = await this.postsHistoryRepository.findOne({
      post_id,
      version: 1
    });

    postHistory.notified = true;
    postHistory.notified_to.push(telegram_id);

    await this.postsHistoryRepository.save(postHistory);
  }
}
