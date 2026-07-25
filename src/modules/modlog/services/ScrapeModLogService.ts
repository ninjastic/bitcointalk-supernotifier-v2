import 'dotenv/config';
import logger from '##/platform/logging/logger';
import { load } from 'cheerio';
import { container } from 'tsyringe';
import { getManager } from 'typeorm';

import api from '../../../shared/services/api';
import ModLog from '../infra/typeorm/entities/ModLog';
import ModLogScrapeState from '../infra/typeorm/entities/ModLogScrapeState';
import getNewModlogPrefixLength from './getNewModlogPrefixLength';
import ParseModLogService from './ParseModLogService';

function fingerprintModlog(modlog: ModLog): string {
  return JSON.stringify([
    modlog.type,
    modlog.user_id,
    modlog.topic_id,
    modlog.post_id,
    modlog.title,
  ]);
}

export default class ScrapeModLogService {
  public async execute(): Promise<number> {
    const response = await api.get('modlog.php');

    const $ = load(response.data);

    const logs = $('#helpmain > ul > li').toArray();

    const parseModLog = container.resolve(ParseModLogService);

    const parsedLogs: Array<{ fingerprint: string; modlog: ModLog }> = [];

    let parseFailed = false;

    for (const log of logs) {
      try {
        const parsedModLog = parseModLog.execute(log);
        parsedLogs.push({
          fingerprint: fingerprintModlog(parsedModLog),
          modlog: parsedModLog,
        });
      } catch (error) {
        parseFailed = true;
        logger.error({ error }, 'Failed to parse modlog entry');
      }
    }

    if (parseFailed) {
      return 0;
    }

    const currentFingerprints = parsedLogs.map(({ fingerprint }) => fingerprint);
    return getManager().transaction(async (transactionManager) => {
      const modLogRepository = transactionManager.getRepository(ModLog);
      const stateRepository = transactionManager.getRepository(ModLogScrapeState);
      const state = await stateRepository.findOne({ where: { id: 1 } });

      let newLogs = parsedLogs;

      if (state) {
        const newPrefixLength = getNewModlogPrefixLength(state.fingerprints, currentFingerprints);
        newLogs = parsedLogs.slice(0, newPrefixLength);
      } else {
        const existingModlogs = await modLogRepository.find();
        const existingCounts = new Map<string, number>();

        for (const modlog of existingModlogs) {
          const fingerprint = fingerprintModlog(modlog);
          existingCounts.set(fingerprint, (existingCounts.get(fingerprint) ?? 0) + 1);
        }

        const seenCounts = new Map<string, number>();
        newLogs = parsedLogs.filter(({ fingerprint }) => {
          const seenCount = (seenCounts.get(fingerprint) ?? 0) + 1;
          seenCounts.set(fingerprint, seenCount);
          return seenCount > (existingCounts.get(fingerprint) ?? 0);
        });
      }

      if (newLogs.length) {
        await modLogRepository.save(newLogs.map(({ modlog }) => modlog));
      }

      await stateRepository.save(
        stateRepository.create({
          id: 1,
          fingerprints: currentFingerprints,
        }),
      );

      return newLogs.length;
    });
  }
}
