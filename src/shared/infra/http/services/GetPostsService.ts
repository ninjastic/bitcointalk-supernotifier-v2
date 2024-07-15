import { container, inject, injectable } from 'tsyringe';

import IFindPostsConditionsDTO from '../../../../modules/posts/dtos/IFindPostsConditionsDTO';

import IPostsRepository from '../../../../modules/posts/repositories/IPostsRepository';

import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';
import { getCensorJSON } from '../../../services/utils';

interface Post {
  post_id: number;
  topic_id: number;
  author: string;
  author_uid: number;
  title: string;
  content: string;
  date: string;
  board_id: number;
  board_name: string;
  archive: boolean;
  created_at: string;
  updated_at: string;
}

interface Data {
  total_results: number;
  posts: Post[];
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
    const censor = getCensorJSON();

    const data = results.body.hits.hits.map(post => {
      const boardName = boards.find(board => board.board_id === post._source.board_id)?.name;

      const postData = { ...post._source, board_name: boardName };

      const shouldCensor = censor?.postIds?.includes(postData.post_id);

      return {
        post_id: postData.post_id,
        topic_id: postData.topic_id,
        author: postData.author,
        author_uid: postData.author_uid,
        title: postData.title,
        content: shouldCensor ? 'Censored by TryNinja due to a privacy request' : postData.content,
        date: postData.date,
        board_id: postData.board_id,
        board_name: postData.board_name,
        archive: postData.archive,
        created_at: postData.created_at,
        updated_at: postData.updated_at
      };
    });

    const response = {
      total_results: results.body.hits.total.value,
      posts: data
    };

    return response;
  }
}
