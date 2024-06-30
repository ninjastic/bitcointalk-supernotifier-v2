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

  public async execute({ post_id }: ScrapePostDTO): Promise<Post | null> {
    const response = await api.get(`index.php?topic=*.msg${post_id}`, {
      validateStatus: status => (status >= 200 && status < 300) || status === 404
    });

    const post = this.parsePostElement.execute({
      html: response.data,
      post_id
    });

    return post;
  }
}
