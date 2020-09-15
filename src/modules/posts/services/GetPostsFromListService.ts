import { inject, injectable } from 'tsyringe';
import { ApiResponse } from '@elastic/elasticsearch';

import IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class GetPostsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public async execute(posts_id: number[]): Promise<ApiResponse> {
    return this.postsRepository.findPostsFromListES(posts_id);
  }
}
