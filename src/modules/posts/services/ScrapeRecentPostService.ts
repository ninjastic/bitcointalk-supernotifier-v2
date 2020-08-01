import { container } from 'tsyringe';
import cheerio from 'cheerio';

import api from '../../../shared/services/api';
import Post from '../infra/schemas/Post';

import ScrapeRecentPostElementService from './ScrapeRecentPostElementService';

export default class ScrapeRecentPostService {
  private scrapeRecentPostElement: ScrapeRecentPostElementService;

  constructor() {
    this.scrapeRecentPostElement = container.resolve(
      ScrapeRecentPostElementService,
    );
  }

  public async execute(): Promise<Post[]> {
    const response = await api.get('index.php?action=recent');
    const $ = cheerio.load(response.data);

    const recentPosts = $('div#bodyarea table[cellpadding="4"] > tbody');

    const scrappedPosts = recentPosts.toArray().map(element => {
      return this.scrapeRecentPostElement.execute(element);
    });

    return scrappedPosts;
  }
}
