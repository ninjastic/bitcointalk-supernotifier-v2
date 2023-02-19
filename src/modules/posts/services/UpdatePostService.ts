import { inject, injectable } from 'tsyringe';

import Post from '../infra/typeorm/entities/Post';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class UpdatePostService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(post: Post): Promise<Post> {
    const foundPost = await this.postsRepository.findOneByPostId(post.post_id);

    await this.postsRepository.save(post);
    await this.cacheRepository.save(`post:${post.post_id}`, post, 'EX', 300);

    return foundPost;
  }
}
