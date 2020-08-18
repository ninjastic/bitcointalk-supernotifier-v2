import { container } from 'tsyringe';
import cheerio from 'cheerio';

import api from '../../../shared/services/api';
import Post from '../infra/typeorm/entities/Post';

import ParseRecentPostElementService from './ParseRecentPostElementService';

export default class ScrapeRecentPostsService {
  private parseRecentPostElement: ParseRecentPostElementService;

  constructor() {
    this.parseRecentPostElement = container.resolve(
      ParseRecentPostElementService,
    );
  }

  public async execute(): Promise<Post[]> {
    const response = await api.get('index.php?action=recent');
    const $ = cheerio.load(response.data, { decodeEntities: false });

    const recentPosts = $('div#bodyarea table[cellpadding="4"] > tbody');

    const scrappedPosts = recentPosts.toArray().map(element => {
      return this.parseRecentPostElement.execute(element);
    });

    return scrappedPosts;
  }
}
