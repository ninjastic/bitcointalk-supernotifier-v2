import { inject, injectable } from 'tsyringe';

import Post from '../../../../modules/posts/infra/typeorm/entities/Post';

import IPostsRepository from '../../../../modules/posts/repositories/IPostsRepository';

@injectable()
export default class PostSearchService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public async execute(search: string, limit: number): Promise<Post[]> {
    return this.postsRepository.findPostsByContent(search, limit);
  }
}
