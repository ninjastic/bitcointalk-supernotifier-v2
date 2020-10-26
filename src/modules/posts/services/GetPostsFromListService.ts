import { container, inject, injectable } from 'tsyringe';
import { ApiResponse } from '@elastic/elasticsearch';

import IPostsRepository from '../repositories/IPostsRepository';

import GetBoardsListService from './GetBoardsListService';

interface Params {
  id_list: number[];
}

@injectable()
export default class GetPostsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public async execute({ id_list }: Params): Promise<ApiResponse> {
    const getBoardsList = container.resolve(GetBoardsListService);

    const results = await this.postsRepository.findPostsFromListES(id_list);
    const boards = await getBoardsList.execute(true);

    const data = results.map(post => {
      const boardName =
        boards.find(board => board.board_id === post.board_id)?.name || null;

      const postData = { ...post, board_name: boardName };

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
        updated_at: postData.updated_at,
      };
    });

    return data;
  }
}
