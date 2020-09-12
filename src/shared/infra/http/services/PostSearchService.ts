import { inject, injectable } from 'tsyringe';
import { ApiResponse } from '@elastic/elasticsearch';

import Post from '../../../../modules/posts/infra/typeorm/entities/Post';

import IPostsRepository from '../../../../modules/posts/repositories/IPostsRepository';

import IFindPostsConditionsDTO from '../../../../modules/posts/dtos/IFindPostsConditionsDTO';

@injectable()
export default class PostSearchService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public async execute(
    {
      author,
      content,
      topic_id,
      last,
      after,
      after_date,
      before_date,
    }: IFindPostsConditionsDTO,
    limit: number,
  ): Promise<ApiResponse> {
    const actual_limit = Math.min(limit || 20, 200);

    return this.postsRepository.findPostsES(
      { author, content, topic_id, last, after, after_date, before_date },
      actual_limit,
    );
  }
}
