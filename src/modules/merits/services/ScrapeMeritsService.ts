import { container } from 'tsyringe';
import cheerio from 'cheerio';

import api from '../../../shared/services/api';
import Merit from '../infra/schemas/Merit';

import ParseMeritElementService from './ParseMeritElementService';

export default class ScrapeMeritsService {
  private parseMeritElement: ParseMeritElementService;

  constructor() {
    this.parseMeritElement = container.resolve(ParseMeritElementService);
  }

  public async execute(): Promise<Merit[]> {
    const response = await api.get('index.php?action=merit;stats=recent');
    const $ = cheerio.load(response.data, { decodeEntities: false });

    const merits = $('ul > li');

    const scrapingPromises = merits
      .toArray()
      .filter((_, index) => {
        if (index >= 10) {
          return false;
        }

        return true;
      })
      .map(element => this.parseMeritElement.execute(element));

    const scrapeResults = await Promise.all(scrapingPromises).then(results => {
      return results;
    });

    return scrapeResults;
  }
}
