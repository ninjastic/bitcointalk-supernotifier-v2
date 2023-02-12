import { container } from 'tsyringe';
import cheerio from 'cheerio';

import api from '../../../shared/services/api';
import Merit from '../infra/typeorm/entities/Merit';

import ParseMeritElementService from './ParseMeritElementService';
import ForumLoginService from './ForumLoginService';

export default class ScrapeMeritsService {
  private parseMeritElement: ParseMeritElementService;

  constructor() {
    this.parseMeritElement = container.resolve(ParseMeritElementService);
  }

  public async execute(): Promise<Merit[]> {
    const response = await api.get('index.php?action=merit;stats=recent');
    const $ = cheerio.load(response.data, { decodeEntities: true });

    const logged = $('#hellomember');

    if (!logged.length) {
      const forumLogin = new ForumLoginService();

      await forumLogin.execute();
    }

    const merits = $('ul > li');

    const scrapingPromises = merits
      .toArray()
      .splice(0, 100)
      .map(element => this.parseMeritElement.execute(element))
      .filter(result => result);

    const scrapeResults = await Promise.all(scrapingPromises).then(results => {
      return results;
    });

    return scrapeResults as Merit[];
  }
}
