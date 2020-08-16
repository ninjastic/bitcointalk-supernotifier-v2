import { inject, injectable } from 'tsyringe';

import Post from '../infra/schemas/Post';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class GetPostService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(post_id: number): Promise<Post> {
    const cachedPost = await this.cacheRepository.recover<Post>(
      `post:${post_id}`,
    );

    if (cachedPost) {
      return cachedPost;
    }

    const foundPost = await this.postsRepository.findByPostId(post_id);

    return foundPost;
  }
}
