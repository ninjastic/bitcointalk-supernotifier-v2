import 'reflect-metadata';
import 'module-alias/register';
import 'dotenv/config';
import { container } from 'tsyringe';
import { createConnection } from 'typeorm';

import '../../../container';
import CheckMeritsService from '../../../../modules/merits/services/CheckMeritsService';
import CheckModLogsService from '../../../../modules/modlog/services/CheckModLogsService';
import checkPostRescrapeSchedules from '../../../../modules/posts/services/check-post-rescrape-schedules';
import CheckPostsAddressesService from '../../../../modules/posts/services/CheckPostsAddressesService';
import CheckPostsService from '../../../../modules/posts/services/CheckPostsService';
import { queueRepeatableFunction } from '../../../services/utils';

async function checkPosts() {
  const checkPostsService = container.resolve(CheckPostsService);
  await checkPostsService.execute();
}

async function checkMerits() {
  const checkMeritsService = container.resolve(CheckMeritsService);
  await checkMeritsService.execute();
}

async function checkModLogs() {
  const checkModLogsService = container.resolve(CheckModLogsService);
  await checkModLogsService.execute();
}

async function checkPostsAddresses() {
  const checkPostsAddressesService = container.resolve(CheckPostsAddressesService);
  await checkPostsAddressesService.execute();
}

async function checker() {
  await createConnection();

  queueRepeatableFunction(checkPosts, 1000 * 5);
  queueRepeatableFunction(checkMerits, 1000 * 60 * 5);
  queueRepeatableFunction(checkModLogs, 1000 * 60 * 5);
  queueRepeatableFunction(checkPostsAddresses, 1000 * 20);
  queueRepeatableFunction(checkPostRescrapeSchedules, 1000 * 30);
}

checker();
