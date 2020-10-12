import { inject, injectable } from 'tsyringe';
import { ApiResponse } from '@elastic/elasticsearch';

import IFindAllPostsHistoryDTO from '../dtos/IFindAllPostsHistoryDTO';

import IPostsHistoryRepository from '../repositories/IPostsHistoryRepository';

@injectable()
export default class GetLatestPostHistoryService {
  constructor(
    @inject('PostsHistoryRepository')
    private postsHistoryRepository: IPostsHistoryRepository,
  ) {}

  public async execute(query: IFindAllPostsHistoryDTO): Promise<ApiResponse> {
    const limit = Math.min(query.limit || 20, 200);

    return this.postsHistoryRepository.findAll({
      ...query,
      limit,
    });
  }
}
