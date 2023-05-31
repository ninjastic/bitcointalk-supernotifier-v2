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

    const isLogged = !!$('#hellomember').length;

    if (!isLogged) {
      const forumLogin = new ForumLoginService();
      await forumLogin.execute();
    }

    const parsedMerits: Merit[] = [];
    const meritElements = $('ul > li');

    for await (const meritElement of meritElements) {
      const parsedMerit = await this.parseMeritElement.execute(meritElement);
      parsedMerits.push(parsedMerit);
    }

    return parsedMerits;
  }
}
