import { container, inject, injectable } from 'tsyringe';

import IFindPostsConditionsDTO from '../../../../modules/posts/dtos/IFindPostsConditionsDTO';

import IPostsRepository, { PostFromES } from '../../../../modules/posts/repositories/IPostsRepository';

import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';

interface Data {
  total_results: number;
  posts: PostFromES[];
}

@injectable()
export default class GetPostSearchService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository
  ) {}

  public async execute(query: IFindPostsConditionsDTO): Promise<Data> {
    const limit = Math.min(query.limit || 20, 200);

    const results = await this.postsRepository.findPostsES({ ...query, limit });

    const getBoardsList = container.resolve(GetBoardsListService);
    const boards = await getBoardsList.execute(true);

    const data = results.hits.hits.map(post => {
      const boardName = boards.find(board => board.board_id === post._source.board_id)?.name;

      const postData = { ...post._source, board_name: boardName };

      return {
        post_id: postData.post_id,
        topic_id: postData.topic_id,
        author: postData.author,
        author_uid: postData.author_uid,
        title: postData.title,
        content: postData.content,
        date: postData.date,
        board_id: postData.board_id,
        board_name: postData.board_name,
        archive: postData.archive,
        created_at: postData.created_at,
        updated_at: postData.updated_at
      };
    });

    const response = {
      total_results: (results.hits.total as { value: number }).value,
      posts: data
    };

    return response;
  }
}
