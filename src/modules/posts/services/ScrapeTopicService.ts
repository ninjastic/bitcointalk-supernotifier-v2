import { injectable, container, inject } from 'tsyringe';

import api from '../../../shared/services/api';
import Post from '../infra/typeorm/entities/Post';

import IPostsRepository from '../repositories/IPostsRepository';

import ParseTopicService from './ParseTopicService';
import SavePostService from './SavePostService';

@injectable()
export default class ScrapeTopicService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository
  ) {}

  public async execute(topic_id: number): Promise<Post | null> {
    const parseTopic = container.resolve(ParseTopicService);
    const savePost = container.resolve(SavePostService);

    const response = await api.get(`index.php?topic=${topic_id}`);

    const post = parseTopic.execute({
      html: response.data,
      topic_id
    });

    const postExists = await this.postsRepository.findOneByPostId(post.post_id);

    if (!postExists) {
      return savePost.execute(post);
    }

    if (postExists.title === '(Unknown Title)' || !postExists.board_id) {
      postExists.title = post.title;
      postExists.board_id = post.board_id;
      postExists.date = post.date;

      await this.postsRepository.save(postExists);
    }

    return postExists;
  }
}
