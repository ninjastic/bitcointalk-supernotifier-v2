import { inject, injectable } from 'tsyringe';

import Post from '../../../../modules/posts/infra/typeorm/entities/Post';

import IPostsRepository from '../../../../modules/posts/repositories/IPostsRepository';

interface PostSearchServiceDTO {
  author?: string;
  content?: string;
}

@injectable()
export default class PostSearchService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public async execute(
    { author, content }: PostSearchServiceDTO,
    limit: number,
  ): Promise<Post[]> {
    return this.postsRepository.findPosts({ author, content }, limit);
  }
}
