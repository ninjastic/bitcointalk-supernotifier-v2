import type IgnoredBoard from '##/modules/posts/infra/typeorm/entities/IgnoredBoard';
import type IgnoredTopic from '##/modules/posts/infra/typeorm/entities/IgnoredTopic';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type IgnoredUser from '##/modules/users/infra/typeorm/entities/IgnoredUser';
import type User from '##/modules/users/infra/typeorm/entities/User';
import type { MentionType } from '##/shared/infra/bull/types/telegram';

import bs58 from 'bs58';
import { load } from 'cheerio';
import JSsha from 'jssha';
import fs from 'node:fs';
import path from 'node:path';
import { container } from 'tsyringe';

import SetUserBlockedService from '../infra/telegram/services/SetUserBlockedService';
import logger from './logger';

function sha256(str: string) {
  const inst = new JSsha('SHA-256', 'HEX');
  inst.update(str);
  return inst.getHash('HEX');
}

export function validateTronAddress(addressBase58Check: string) {
  try {
    if (typeof addressBase58Check !== 'string' || addressBase58Check.length !== 34) return false;
    const bytes = Buffer.from(Array.from(bs58.decode(addressBase58Check)));
    const checkSum = Buffer.from(Array.from(bytes.subarray(bytes.length - 4))).toString('hex');
    const addressWithoutCheckSum = Buffer.from(
      Array.from(bytes.subarray(0, bytes.length - 4)),
    ).toString('hex');
    const doubleHash = sha256(sha256(addressWithoutCheckSum));
    const expectedCheckSum = doubleHash.slice(0, 8);
    return expectedCheckSum === checkSum;
  } catch (error) {
    return false;
  }
}

export async function checkBotNotificationError(
  error: any,
  telegram_id: string,
  ...meta: any
): Promise<boolean> {
  const setUserBlocked = container.resolve(SetUserBlockedService);
  const errorMessage: string = error.response?.description || error.message;

  const isBotBlocked = [
    'Forbidden: bot was blocked by the user',
    'Forbidden: user is deactivated',
    'Forbidden: bot was kicked from the group chat',
    'Forbidden: the group chat was deleted',
    'Bad Request: chat not found',
  ].some((patternMessage) => errorMessage.match(new RegExp(patternMessage, 'i')));

  if (isBotBlocked) {
    logger.info({ telegramId: telegram_id, meta }, 'Telegram user marked as blocked');
    await setUserBlocked.execute(telegram_id);
    return true;
  }
  logger.error({ error, telegramId: telegram_id, meta }, 'Error while sending telegram message');
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

interface CensorJsonType {
  postAddresses: string[];
  postIds: number[];
  topicIds: number[];
}

export function getCensorJSON(): CensorJsonType {
  try {
    const absolutePath = path.resolve(path.resolve(__dirname, '..', '..', '..', 'censor.json'));
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    return JSON.parse(fileContent) as CensorJsonType;
  } catch (error) {
    return {} as CensorJsonType;
  }
}

export const escapeUsername = (text: string): string =>
  text.replace(/([.*+?^${}()|[\]\\<>])/g, '\\$1');

export function createMentionRegex(username: string): RegExp {
  return new RegExp(`(?<!\\w)${escapeUsername(username)}(?!\\w)`, 'gi');
}

export interface PreparedPostMentionContent {
  quoteHeaderText: string;
  contentWithoutQuoteHeaders: string;
}

export interface NotificationIgnoreIndex {
  ignoredUsersByAuthor: Map<string, Set<string>>;
  ignoredTopicsByTopicId: Map<number, Set<string>>;
  ignoredBoardsByKey: Set<string>;
}

const emptyNotificationIgnoreIndex: NotificationIgnoreIndex = {
  ignoredUsersByAuthor: new Map(),
  ignoredTopicsByTopicId: new Map(),
  ignoredBoardsByKey: new Set(),
};

function appendToSetMap<T>(map: Map<T, Set<string>>, key: T, value: string): void {
  const current = map.get(key) ?? new Set<string>();
  current.add(value);
  map.set(key, current);
}

export function createNotificationIgnoreIndex(
  ignoredUsers: IgnoredUser[] = [],
  ignoredTopics: IgnoredTopic[] = [],
  ignoredBoards: IgnoredBoard[] = [],
): NotificationIgnoreIndex {
  const ignoredUsersByAuthor = new Map<string, Set<string>>();
  const ignoredTopicsByTopicId = new Map<number, Set<string>>();
  const ignoredBoardsByKey = new Set<string>();

  ignoredUsers.forEach((ignoredUser) => {
    const username = ignoredUser.username?.toLowerCase();
    if (!username) return;

    ignoredUser.ignoring.forEach((telegramId) =>
      appendToSetMap(ignoredUsersByAuthor, username, telegramId),
    );
  });

  ignoredTopics.forEach((ignoredTopic) => {
    ignoredTopic.ignoring.forEach((telegramId) =>
      appendToSetMap(ignoredTopicsByTopicId, ignoredTopic.topic_id, telegramId),
    );
  });

  ignoredBoards.forEach((ignoredBoard) => {
    ignoredBoardsByKey.add(`${ignoredBoard.board_id}:${ignoredBoard.telegram_id}`);
  });

  return {
    ignoredUsersByAuthor,
    ignoredTopicsByTopicId,
    ignoredBoardsByKey,
  };
}

export function preparePostMentionContent(content: string): PreparedPostMentionContent {
  const post$ = load(content);

  post$('br').replaceWith('\n');
  post$('div, p').each((_, el) => {
    post$(el).prepend('\n').append('\n');
  });

  const quoteHeaderText = post$('div.quoteheader').text();

  post$('div.quoteheader').remove();

  return {
    quoteHeaderText,
    contentWithoutQuoteHeaders: post$.root().text(),
  };
}

export function shouldNotifyUser(
  post: Post,
  user: User,
  ignoredUsers: IgnoredUser[] = [],
  ignoredTopics: IgnoredTopic[] = [],
  ignoredBoards: IgnoredBoard[] = [],
): boolean {
  const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
  const isSameUid = user.user_id && post.author_uid === user.user_id;
  const isUserBlocked = user.blocked;
  const isAuthorIgnored = ignoredUsers
    .find((ignoredUser) => ignoredUser.username.toLowerCase() === post.author.toLowerCase())
    ?.ignoring.includes(user.telegram_id);
  const isTopicIgnored = ignoredTopics
    .find((ignoredTopic) => ignoredTopic.topic_id === post.topic_id)
    ?.ignoring.includes(user.telegram_id);
  const isBoardIgnored = ignoredBoards.find(
    (ignoredBoard) =>
      ignoredBoard.board_id === post.board_id && ignoredBoard.telegram_id === user.telegram_id,
  );

  return !(
    isSameUsername ||
    isSameUid ||
    isAuthorIgnored ||
    isTopicIgnored ||
    isUserBlocked ||
    isBoardIgnored
  );
}

export function shouldNotifyUserWithIndex(
  post: Post,
  user: User,
  ignoreIndex: NotificationIgnoreIndex = emptyNotificationIgnoreIndex,
): boolean {
  const isSameUsername = user.username && post.author.toLowerCase() === user.username.toLowerCase();
  const isSameUid = user.user_id && post.author_uid === user.user_id;
  const isUserBlocked = user.blocked;
  const isAuthorIgnored = ignoreIndex.ignoredUsersByAuthor
    .get(post.author.toLowerCase())
    ?.has(user.telegram_id);
  const isTopicIgnored = ignoreIndex.ignoredTopicsByTopicId
    .get(post.topic_id)
    ?.has(user.telegram_id);
  const isBoardIgnored = ignoreIndex.ignoredBoardsByKey.has(`${post.board_id}:${user.telegram_id}`);

  return !(
    isSameUsername ||
    isSameUid ||
    isAuthorIgnored ||
    isTopicIgnored ||
    isUserBlocked ||
    isBoardIgnored
  );
}

export function isUserMentionedInPreparedContent(
  preparedContent: PreparedPostMentionContent,
  user: { username?: string; alternative_usernames?: string[] },
  onlyDirectAndQuote?: boolean,
): {
  isMentioned: boolean;
  mentionType: MentionType | null;
} {
  if (!user.username) return { isMentioned: false, mentionType: null };

  const regexList: Array<{
    expression: RegExp;
    mentionType: MentionType;
  }> = [];

  const quoteRegex = new RegExp(`Quote from: ${escapeUsername(user.username)} on`, 'gi');
  regexList.push({ expression: quoteRegex, mentionType: 'quoted_mention' });

  const directMentionRegex = new RegExp(`@${escapeUsername(user.username)}`, 'gi');
  regexList.push({ expression: directMentionRegex, mentionType: 'direct_mention' });

  if (!onlyDirectAndQuote) {
    const usernameRegex = createMentionRegex(user.username);
    regexList.push({ expression: usernameRegex, mentionType: 'username' });
  }

  if (user.alternative_usernames?.length) {
    const altUsernameRegex = createMentionRegex(user.alternative_usernames[0]);
    regexList.push({ expression: altUsernameRegex, mentionType: 'alternative_username' });
  }

  for (const regex of regexList) {
    const textToSearch =
      regex.mentionType === 'quoted_mention'
        ? preparedContent.quoteHeaderText
        : preparedContent.contentWithoutQuoteHeaders;

    if (textToSearch.match(regex.expression)) {
      return { isMentioned: true, mentionType: regex.mentionType };
    }
  }

  return { isMentioned: false, mentionType: null };
}

export function isUserMentionedInPost(
  content: string,
  user: { username?: string; alternative_usernames?: string[] },
  onlyDirectAndQuote?: boolean,
): {
  isMentioned: boolean;
  mentionType: MentionType | null;
} {
  return isUserMentionedInPreparedContent(
    preparePostMentionContent(content),
    user,
    onlyDirectAndQuote,
  );
}

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

export function isAprilFools() {
  const currentDate = new Date();
  const dia = currentDate.getDate();
  const mes = currentDate.getMonth();
  if (dia === 1 && mes === 3) {
    return true;
  } else {
    return false;
  }
}
