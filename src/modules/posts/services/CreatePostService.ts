import { injectable, inject } from 'tsyringe';

import IPostsRepository from '../repositories/IPostsRepository';

import Post from '../infra/typeorm/entities/Post';
import CreatePostDTO from '../dtos/CreatePostDTO';

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
