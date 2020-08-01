import { container } from 'tsyringe';
import cheerio from 'cheerio';

import api from '../../../shared/services/api';
import Merit from '../infra/schemas/Merit';

import ScrapeMeritElementService from './ScrapeMeritElementService';

export default class ScrapeMeritsService {
  private scrapeMeritElement: ScrapeMeritElementService;

  constructor() {
    this.scrapeMeritElement = container.resolve(ScrapeMeritElementService);
  }

  public async execute(): Promise<Merit[]> {
    const response = await api.get('index.php?action=merit;stats=recent');
    const $ = cheerio.load(response.data);

    const merits = $('ul > li');
    const scrappedMerits = [];

    merits.each(async (index, element) => {
      if (index >= 1) {
        return;
      }

      const merit = await this.scrapeMeritElement.execute(element);
      scrappedMerits.push(merit);
    });

    // console.log(scrappedMerits);

    return scrappedMerits;
  }
}
