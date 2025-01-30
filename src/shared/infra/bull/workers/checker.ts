import 'reflect-metadata';
import 'module-alias/register';
import 'dotenv/config.js';
import { container } from 'tsyringe';
import { createConnection } from 'typeorm';

import '../../../container';

import { queueRepeatableFunction } from '../../../services/utils';

import CheckPostsService from '../../../../modules/posts/services/CheckPostsService';
import CheckPostsHistoryService from '../../../../modules/posts/services/CheckPostsHistoryService';
import CheckMeritsService from '../../../../modules/merits/services/CheckMeritsService';
import CheckModLogsService from '../../../../modules/modlog/services/CheckModLogsService';
import CheckPostsAddressesService from '../../../../modules/posts/services/CheckPostsAddressesService';
import CheckPostsRescraperForChangesService from '../../../../modules/posts/services/CheckPostsRescraperForChangesService';

const checkPosts = async () => {
  const checkPostsService = container.resolve(CheckPostsService);
  await checkPostsService.execute();
};

const checkPostsHistory = async () => {
  const checkPostsHistoryService = container.resolve(CheckPostsHistoryService);
  await checkPostsHistoryService.execute();
};

const checkMerits = async () => {
  const checkMeritsService = container.resolve(CheckMeritsService);
  await checkMeritsService.execute();
};

const checkModLogs = async () => {
  const checkModLogsService = container.resolve(CheckModLogsService);
  await checkModLogsService.execute();
};

const checkPostsAddresses = async () => {
  const checkPostsAddressesService = container.resolve(CheckPostsAddressesService);
  await checkPostsAddressesService.execute();
};

const checkPostsRescraperForChanges = async () => {
  const checkPostsRescraperForChangesService = container.resolve(CheckPostsRescraperForChangesService);
  await checkPostsRescraperForChangesService.execute();
};

const checker = async () => {
  await createConnection();

  queueRepeatableFunction(checkPosts, 1000 * 5);
  queueRepeatableFunction(checkMerits, 1000 * 60 * 5);
  queueRepeatableFunction(checkPostsHistory, 1000 * 60 * 2);
  queueRepeatableFunction(checkModLogs, 1000 * 60 * 5);
  queueRepeatableFunction(checkPostsAddresses, 1000 * 20);
  queueRepeatableFunction(checkPostsRescraperForChanges, 1000 * 30);
};

checker();
