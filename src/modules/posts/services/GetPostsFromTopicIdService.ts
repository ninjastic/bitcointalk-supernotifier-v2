import { inject, injectable } from 'tsyringe';

import IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class GetPostsFromTopicIdService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public async execute(topic_id: number): Promise<any> {
    if (Number.isNaN(topic_id)) {
      throw new Error('topic_id is invalid');
    }

    const dataRaw = await this.postsRepository.findPostsByTopicId(topic_id);

    const data = dataRaw.body.hits.hits.map(post => {
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
      data,
    };

    return response;
  }
}
