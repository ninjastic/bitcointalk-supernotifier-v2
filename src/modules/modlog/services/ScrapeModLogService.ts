import 'dotenv/config';
import cheerio from 'cheerio';
import { container } from 'tsyringe';

import api from '../../../shared/services/api';

import ParseModLogService from './ParseModLogService';
import SaveModLogService from './SaveModLogService';
import ModLog from '../infra/typeorm/entities/ModLog';

export default class ScrapeModLogService {
  public async execute(): Promise<void> {
    const response = await api.get('modlog.php');

    const $ = cheerio.load(response.data, { decodeEntities: false });

    const logsToScrape = $('#helpmain > ul > li')
      .toArray()
      .filter((_, index) => {
        if (index >= 100) {
          return false;
        }

        return true;
      });

    const parseModLog = container.resolve(ParseModLogService);

    const scrapeResults = logsToScrape.map(modLogElement => {
      return parseModLog.execute(modLogElement);
    });

    const filteredScrapeResults = scrapeResults.filter(result => {
      return result;
    });

    const saveModLog = container.resolve(SaveModLogService);

    await Promise.all(
      filteredScrapeResults.map(async (modLog: ModLog) => {
        await saveModLog.execute(modLog);
      }),
    );
  }
}
