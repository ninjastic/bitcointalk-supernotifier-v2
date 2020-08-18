import { injectable, container } from 'tsyringe';

import api from '../../../shared/services/api';
import Post from '../infra/typeorm/entities/Post';

import ScrapePostDTO from '../dtos/ScrapePostDTO';

import ParsePostElementService from './ParsePostElementService';

@injectable()
export default class ScrapePostService {
  private parsePostElement: ParsePostElementService;

  constructor() {
    this.parsePostElement = container.resolve(ParsePostElementService);
  }

  public async execute({
    topic_id,
    post_id,
  }: ScrapePostDTO): Promise<Post | null> {
    const response = await api.get(`index.php?topic=${topic_id}.msg${post_id}`);

    const post = this.parsePostElement.execute({
      html: response.data,
      topic_id,
      post_id,
    });

    return post;
  }
}
