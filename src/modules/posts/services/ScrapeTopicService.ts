import { injectable, container } from 'tsyringe';

import api from '../../../shared/services/api';
import Post from '../infra/typeorm/entities/Post';

import ParseTopicElementService from './ParseTopicElementService';
import GetPostService from './GetPostService';
import SavePostService from './SavePostService';

@injectable()
export default class ScrapeTopicService {
  private parseTopicElement: ParseTopicElementService;

  private getPost: GetPostService;

  private savePost: SavePostService;

  constructor() {
    this.parseTopicElement = container.resolve(ParseTopicElementService);
    this.getPost = container.resolve(GetPostService);
    this.savePost = container.resolve(SavePostService);
  }

  public async execute(topic_id: number): Promise<Post | null> {
    const response = await api.get(`index.php?topic=${topic_id}`);

    const post = this.parseTopicElement.execute({
      html: response.data,
      topic_id,
    });

    const postExists = await this.getPost.execute(
      post.post_id,
      post.topic_id,
      true,
    );

    if (!postExists) {
      return this.savePost.execute(post);
    }

    return post;
  }
}
