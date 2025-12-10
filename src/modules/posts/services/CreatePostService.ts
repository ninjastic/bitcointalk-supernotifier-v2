import { inject, injectable } from 'tsyringe';

import type CreatePostDTO from '../dtos/CreatePostDTO';
import type Post from '../infra/typeorm/entities/Post';
import type IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class CreatePostService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public execute(post: CreatePostDTO): Post {
    const postCreated = this.postsRepository.create(post);

    return postCreated;
  }
}
