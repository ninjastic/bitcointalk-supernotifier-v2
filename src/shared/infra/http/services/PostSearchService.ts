import { inject, injectable } from 'tsyringe';

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
      board,
      after_date,
      before_date,
    }: IFindPostsConditionsDTO,
    limit: number,
    post_id_order?: 'ASC' | 'DESC',
  ): Promise<any> {
    const actual_limit = Math.min(limit || 20, 200);

    const dataRaw = await this.postsRepository.findPostsES(
      {
        author,
        content,
        topic_id,
        last,
        after,
        board,
        after_date,
        before_date,
      },
      actual_limit,
      post_id_order,
    );

    const posts = dataRaw.body.hits.hits.map(post => {
      const postData = post._source;

      return {
        post_id: postData.post_id,
        topic_id: postData.topic_id,
        author: postData.author,
        author_uid: postData.author_uid,
        title: postData.title,
        content: postData.content,
        date: postData.date,
        board_id: postData.board_id,
        archive: postData.archive,
        created_at: postData.created_at,
        updated_at: postData.updated_at,
      };
    });

    const response = {
      timed_out: dataRaw.body.timed_out,
      result: 'success',
      data: {
        total_results: dataRaw.body.hits.total.value,
        posts,
      },
    };

    return response;
  }
}
