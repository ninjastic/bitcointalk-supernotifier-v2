import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

import { inject, injectable } from 'tsyringe';

import type IFindAllPostsHistoryDTO from '../dtos/IFindAllPostsHistoryDTO';
import type IPostsHistoryRepository from '../repositories/IPostsHistoryRepository';

@injectable()
export default class GetLatestPostHistoryService {
  constructor(
    @inject('PostsHistoryRepository')
    private postsHistoryRepository: IPostsHistoryRepository,
  ) {}

  public async execute(query: IFindAllPostsHistoryDTO): Promise<SearchResponse> {
    const limit = Math.min(query.limit || 20, 200);

    return this.postsHistoryRepository.findAll({
      ...query,
      limit,
    });
  }
}
