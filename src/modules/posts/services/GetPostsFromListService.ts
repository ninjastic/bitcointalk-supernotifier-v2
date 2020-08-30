import { inject, injectable } from 'tsyringe';

import Post from '../infra/typeorm/entities/Post';

import IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class GetPostsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public async execute(posts_id: number[]): Promise<Post[]> {
    return this.postsRepository.findPostsFromList(posts_id);
  }
}
