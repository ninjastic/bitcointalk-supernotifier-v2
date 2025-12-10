import 'dotenv/config';
import { load } from 'cheerio';
import { container } from 'tsyringe';

import type ModLog from '../infra/typeorm/entities/ModLog';

import api from '../../../shared/services/api';
import ParseModLogService from './ParseModLogService';
import SaveModLogService from './SaveModLogService';

export default class ScrapeModLogService {
  public async execute(): Promise<number> {
    const response = await api.get('modlog.php');

    const $ = load(response.data, { decodeEntities: true });

    const logsToScrape = $('#helpmain > ul > li')
      .toArray()
      .filter((_, index) => {
        if (index >= 100) {
          return false;
        }

        return true;
      });

    const parseModLog = container.resolve(ParseModLogService);
    const saveModLog = container.resolve(SaveModLogService);

    const scrapeResults = logsToScrape.map(modLogElement => parseModLog.execute(modLogElement));
    const filteredScrapeResults = scrapeResults.filter(result => Boolean(result)) as ModLog[];

    for await (const modLog of filteredScrapeResults) {
      await saveModLog.execute(modLog);
    }

    return filteredScrapeResults.length;
  }
}
