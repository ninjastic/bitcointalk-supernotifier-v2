import { inject, injectable } from 'tsyringe';

import Post from '../infra/typeorm/entities/Post';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class SavePostService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(post: Post): Promise<Post> {
    const cachedPost = await this.cacheRepository.recover<Post>(
      `post:${post.post_id}`,
    );

    if (cachedPost) {
      return cachedPost;
    }

    const foundPost = await this.postsRepository.findByPostId(post.post_id);

    if (foundPost) {
      return foundPost;
    }

    const savedPost = await this.postsRepository.save(post);

    await this.cacheRepository.save(`post:${post.post_id}`, post, 'EX', 180);

    return savedPost;
  }
}
