import { inject, injectable } from 'tsyringe';

import type IPostsHistoryRepository from '../repositories/IPostsHistoryRepository';

@injectable()
export default class SetPostHistoryCheckedService {
  constructor(
    @inject('PostsHistoryRepository')
    private postsHistoryRepository: IPostsHistoryRepository,
  ) {}

  public async execute(post_id: number, version: number): Promise<void> {
    const postHistory = await this.postsHistoryRepository.findOne({
      post_id,
      version,
    });

    postHistory.checked = true;

    await this.postsHistoryRepository.save(postHistory);
  }
}
