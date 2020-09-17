import { inject, injectable } from 'tsyringe';

import PostHistory from '../infra/typeorm/entities/PostHistory';

import IPostsHistoryRepository from '../repositories/IPostsHistoryRepository';

@injectable()
export default class GetLatestPostHistoryService {
  constructor(
    @inject('PostsHistoryRepository')
    private postsHistoryRepository: IPostsHistoryRepository,
  ) {}

  public async execute(limit?: number): Promise<PostHistory[]> {
    const actual_limit = Math.min(limit || 20, 200);

    return this.postsHistoryRepository.find(actual_limit);
  }
}
