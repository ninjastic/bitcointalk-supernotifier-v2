import { inject, injectable } from 'tsyringe';

import type PostHistory from '../infra/typeorm/entities/PostHistory';
import type IPostsHistoryRepository from '../repositories/IPostsHistoryRepository';

@injectable()
export default class GetPostsHistoryByPostIdService {
  constructor(
    @inject('PostsHistoryRepository')
    private postsHistoryRepository: IPostsHistoryRepository,
  ) {}

  public async execute({ post_id }: { post_id: number }): Promise<PostHistory> {
    return this.postsHistoryRepository.findOne({ post_id, version: 1 });
  }
}
