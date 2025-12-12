import 'dotenv/config';
import { load } from 'cheerio';
import { container } from 'tsyringe';

import api from '../../../shared/services/api';
import ParseModLogService from './ParseModLogService';
import SaveModLogService from './SaveModLogService';

export default class ScrapeModLogService {
  public async execute(): Promise<number> {
    const response = await api.get('modlog.php');

    const $ = load(response.data, { decodeEntities: true });

    const logs = $('#helpmain > ul > li')
      .toArray()
      .slice(0, 100);

    const parseModLog = container.resolve(ParseModLogService);
    const saveModLog = container.resolve(SaveModLogService);

    let savedLogsCount = 0;

    for (const log of logs) {
      try {
        const parsedLog = parseModLog.execute(log);
        await saveModLog.execute(parsedLog);
        savedLogsCount++;
      }
      catch (error) {
        console.error('Failed to parse/save modlog entry:', error);
      }
    }

    return savedLogsCount;
  }
}
