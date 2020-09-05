import { inject, injectable } from 'tsyringe';

import Post from '../infra/typeorm/entities/Post';

import IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class GetPostsFromTopicIdService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public async execute(topic_id: number): Promise<Post[]> {
    return this.postsRepository.findPostsByTopicId(topic_id);
  }
}
