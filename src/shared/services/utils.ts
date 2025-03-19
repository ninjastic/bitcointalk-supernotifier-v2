import bs58 from 'bs58';
import JSsha from 'jssha';
import { container } from 'tsyringe';
import fs from 'fs';
import path from 'path';

import Post from '##/modules/posts/infra/typeorm/entities/Post';
import User from '##/modules/users/infra/typeorm/entities/User';
import IgnoredUser from '##/modules/users/infra/typeorm/entities/IgnoredUser';
import IgnoredTopic from '##/modules/posts/infra/typeorm/entities/IgnoredTopic';
import SetUserBlockedService from '../infra/telegram/services/SetUserBlockedService';
import logger from './logger';

const sha256 = (str: string) => {
  const inst = new JSsha('SHA-256', 'HEX');
  inst.update(str);
  return inst.getHash('HEX');
};

export function validateTronAddress(addressBase58Check: string) {
  try {
    if (typeof addressBase58Check !== 'string' || addressBase58Check.length !== 34) return false;
    const bytes = Buffer.from(bs58.decode(addressBase58Check));
    const checkSum = Buffer.from(bytes.subarray(bytes.length - 4)).toString('hex');
    const addressWithoutCheckSum = Buffer.from(bytes.subarray(0, bytes.length - 4)).toString('hex');
    const doubleHash = sha256(sha256(addressWithoutCheckSum));
    const expectedCheckSum = doubleHash.slice(0, 8);
    return expectedCheckSum === checkSum;
  } catch (e) {
    return false;
  }
}

export async function checkBotNotificationError(error: any, telegram_id: string, ...meta: any): Promise<boolean> {
  const setUserBlocked = container.resolve(SetUserBlockedService);
  const errorMessage: string = error.response?.description || error.message;

  const isBotBlocked = [
    'Forbidden: bot was blocked by the user',
    'Forbidden: user is deactivated',
    'Forbidden: bot was kicked from the group chat',
    'Forbidden: the group chat was deleted',
    'Bad Request: chat not found'
  ].some(patternMessage => errorMessage.match(new RegExp(patternMessage, 'i')));

  if (isBotBlocked) {
    logger.info({ telegram_id, meta }, 'Telegram user marked as blocked');
    await setUserBlocked.execute(telegram_id);
    return true;
  }
  logger.error({ error, telegram_id, meta }, 'Error while sending telegram message');
  return false;
}

export async function queueRepeatableFunction(fn: () => Promise<any>, ms: number): Promise<void> {
  try {
    await fn();
  } catch (error) {
    logger.error(error, `[${fn.name}] queueRepeatableFunction error`);
  } finally {
    setTimeout(async () => queueRepeatableFunction(fn, ms), ms);
  }
}

type CensorJsonType = {
  postAddresses: string[];
  postIds: number[];
  topicIds: number[];
};

export function getCensorJSON(): CensorJsonType {
  try {
    const absolutePath = path.resolve(path.resolve(__dirname, '..', '..', '..', 'censor.json'));
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    return JSON.parse(fileContent) as CensorJsonType;
  } catch (error) {
    return {} as CensorJsonType;
  }
}

export const escapeUsername = (text: string): string => text.replace(/([.*+?^${}()|[\]\\<>])/g, '\\$1');

export const createMentionRegex = (username: string): RegExp =>
  new RegExp(`(?<!\\w)${escapeUsername(username)}(?!\\w)`, 'gi');

export const shouldNotifyUser = (
  post: Post,
  user: User,
  ignoredUsers: IgnoredUser[],
  ignoredTopics: IgnoredTopic[]
): boolean => {
  const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
  const isSameUid = user.user_id && post.author_uid === user.user_id;
  const isUserBlocked = user.blocked;
  const isAuthorIgnored = ignoredUsers
    .find(ignoredUser => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
    ?.ignoring.includes(user.telegram_id);
  const isTopicIgnored = ignoredTopics
    .find(ignoredTopic => ignoredTopic.topic_id === post.topic_id)
    ?.ignoring.includes(user.telegram_id);

  return !(isSameUsername || isSameUid || isAuthorIgnored || isTopicIgnored || isUserBlocked);
};

export const isUserMentionedInPost = (post: Post, user: { username?: string; alternative_usernames?: string[] }): boolean => {
  if (!user.username) return false;
  
  const regexList = []

  const usernameRegex = createMentionRegex(user.username);
  const backupAtSignRegex = new RegExp(`@${escapeUsername(user.username)}`, 'gi');
  const backupQuotedRegex = new RegExp(`Quote from: ${escapeUsername(user.username)} on`, 'gi');

  regexList.push(usernameRegex, backupAtSignRegex, backupQuotedRegex);

  if (user.alternative_usernames?.length) {
    const altUsernameRegex = createMentionRegex(user.alternative_usernames[0]);
    regexList.push(altUsernameRegex)
  }

  return regexList.some(regex => regex && post.content.match(regex));
};

export function isValidPostgresInt(num: number) {
  const INT_MIN = -2147483648;
  const INT_MAX = 2147483647;

  if (typeof num !== 'number' || !Number.isInteger(num)) {
    return false;
  }

  if (num < INT_MIN || num > INT_MAX) {
    return false;
  }

  return true;
}
