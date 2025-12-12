import 'dotenv/config';
import logger from '##/shared/services/logger';
import { load } from 'cheerio';
import { container } from 'tsyringe';
import { getRepository } from 'typeorm';

import api from '../../../shared/services/api';
import ModLog from '../infra/typeorm/entities/ModLog';
import ParseModLogService from './ParseModLogService';

export default class ScrapeModLogService {
  public async execute(): Promise<number> {
    const modLogRepository = getRepository(ModLog);
    const response = await api.get('modlog.php');

    const $ = load(response.data, { decodeEntities: true });

    const logs = $('#helpmain > ul > li')
      .toArray()
      .slice(0, 100);

    const parseModLog = container.resolve(ParseModLogService);

    let savedLogsCount = 0;

    for (const log of logs) {
      try {
        const parsedModLog = parseModLog.execute(log);

        const foundModLog = await modLogRepository.findOne({ where: {
          type: parsedModLog.type,
          user_id: parsedModLog.user_id,
          topic_id: parsedModLog.topic_id,
          post_id: parsedModLog.post_id,
        } });

        if (foundModLog) {
          continue;
        }

        const savedLog = await modLogRepository.save(parsedModLog);
        if (savedLog) {
          savedLogsCount++;
        }
      }
      catch (error) {
        logger.error('Failed to parse/save modlog entry:', error);
      }
    }

    return savedLogsCount;
  }
}
