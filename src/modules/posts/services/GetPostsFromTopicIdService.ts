import { ApiResponse } from '@elastic/elasticsearch';
import { inject, injectable } from 'tsyringe';

import IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class GetPostsFromTopicIdService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public async execute(topic_id: number): Promise<ApiResponse> {
    if (Number.isNaN(topic_id)) {
      throw new Error('topic_id is invalid');
    }

    return this.postsRepository.findPostsByTopicId(topic_id);
  }
}
