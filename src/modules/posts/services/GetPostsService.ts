import { inject, injectable } from 'tsyringe';

import Post from '../infra/typeorm/entities/Post';

import IPostsRepository from '../repositories/IPostsRepository';
import IFindPostsConditionsDTO from '../dtos/IFindPostsConditionsDTO';

@injectable()
export default class GetPostsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public async execute(
    conditions: IFindPostsConditionsDTO,
    limit?: number,
  ): Promise<Post[]> {
    const posts = await this.postsRepository.findPosts(conditions, limit);

    return posts;
  }
}
