import { container } from 'tsyringe';
import { sub } from 'date-fns';
import cheerio from 'cheerio';

import api from '../../../shared/services/api';
import Post from '../infra/typeorm/entities/Post';

import { RecentPostWithFooter } from '../repositories/IScrapePostsRepository';
import ParseRecentPostElementService from './ParseRecentPostElementService';

export default class ScrapeRecentPostsService {
  private parseRecentPostElement: ParseRecentPostElementService;

  constructor() {
    this.parseRecentPostElement = container.resolve(ParseRecentPostElementService);
  }

  public async execute(): Promise<Post[]> {
    const response = await api.get('index.php?action=recent');
    const $ = cheerio.load(response.data, { decodeEntities: true });

    const currentDate = sub(
      new Date($('body > div.tborder > table:nth-child(2) > tbody > tr:nth-child(1) > td:nth-child(2) > span').text()),
      { minutes: new Date().getTimezoneOffset() }
    );

    const recentPostsWithFooter = [...$('div#bodyarea > table > tbody')].reduce<RecentPostWithFooter[]>(
      (array, element, index) => {
        const _array = Array.from(array);
        const isPostContent = index % 2 === 0;
        const recentPostIndex = Math.floor(index / 2);
        if (!_array[recentPostIndex]) {
          _array[recentPostIndex] = {} as RecentPostWithFooter;
        }

        if (isPostContent) {
          _array[recentPostIndex] = Object.assign(_array[recentPostIndex], { postElement: element });
        } else {
          _array[recentPostIndex] = Object.assign(_array[recentPostIndex], { footerElement: element });
        }
        return _array;
      },
      []
    );

    const scrappedPosts = recentPostsWithFooter.map(element =>
      this.parseRecentPostElement.execute(element, currentDate)
    );
    return scrappedPosts;
  }
}
