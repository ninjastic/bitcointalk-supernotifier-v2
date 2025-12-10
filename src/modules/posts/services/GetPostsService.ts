import { inject, injectable } from 'tsyringe';

import type IFindPostsConditionsDTO from '../dtos/IFindPostsConditionsDTO';
import type Post from '../infra/typeorm/entities/Post';
import type IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class GetPostsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public async execute(conditions: IFindPostsConditionsDTO): Promise<Post[]> {
    const posts = await this.postsRepository.findPosts(conditions);

    return posts;
  }
}
