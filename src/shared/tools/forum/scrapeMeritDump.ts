import 'reflect-metadata';
import 'dotenv/config';
import { PostScraper } from '##/modules/posts/services/scraper/post-scraper';
import axios from 'axios';
import { load } from 'cheerio';
import { format, getUnixTime, isEqual } from 'date-fns';
import lzma from 'lzma-native';
import Queue from 'promise-queue';
import { container } from 'tsyringe';

import '../../container';

import { createConnection, createQueryBuilder, getManager } from 'typeorm';

import type Merit from '../../../modules/merits/infra/typeorm/entities/Merit';

import MeritsRepository from '../../../modules/merits/infra/typeorm/repositories/MeritsRepository';
import api from '../../services/api';

type MeritPartialKeys = 'date' | 'amount' | 'topic_id' | 'post_id' | 'sender_uid' | 'receiver_uid';
type MeritPartial = Pick<Merit, MeritPartialKeys>;

async function scrapeUserProfile(userId: number): Promise<string> {
  const res = await api.get(`index.php?action=profile;u=${userId}`);
  const $ = load(res.data, { decodeEntities: true });

  const username = $(
    '#bodyarea  tr:nth-child(2) > td:nth-child(1) > table > tbody > tr:nth-child(1) > td:nth-child(2)',
  ).text();

  console.log('scraped user', userId, username);

  return username;
}

async function getListOfMerits(shouldScrapeLoyce: boolean): Promise<MeritPartial[]> {
  if (shouldScrapeLoyce) {
    console.log('downloading Loyce\'s merit dump');
    const { data } = await axios.get('https://loyce.club/Merit/merit.all.txt');

    const merits = data
      .split('\n')
      .map(line => line.split('\t'))
      .filter(meritArr => meritArr.length === 5)
      .map(([timeUnix, amount, msg, user_from, user_to]) => ({
        date: new Date(Number(timeUnix) * 1000),
        amount: Number(amount),
        topic_id: Number(msg.match(/(\d+)\.msg/)[1]),
        post_id: Number(msg.match(/\d+\.msg(\d+)/)[1]),
        sender_uid: Number(user_from),
        receiver_uid: Number(user_to),
      }));

    return merits;
  }

  console.log('downloading last merit dump');
  const res = await axios.get('https://bitcointalk.org/merit.txt.xz', {
    responseType: 'arraybuffer',
  });

  const meritsBuffer = await new Promise<Buffer>((resolve) => {
    lzma.decompress(res.data, { synchronous: true }, file => resolve(file));
  });

  const merits = meritsBuffer
    .toString()
    .split('\n')
    .map(line => line.split('\t'))
    .splice(1)
    .filter(meritArr => meritArr.length === 5)
    .map(([timeUnix, amount, msg, user_from, user_to]) => ({
      date: new Date(Number(timeUnix) * 1000),
      amount: Number(amount),
      topic_id: Number(msg.match(/(\d+)\.msg/)[1]),
      post_id: Number(msg.match(/\d+\.msg(\d+)/)[1]),
      sender_uid: Number(user_from),
      receiver_uid: Number(user_to),
    }));

  return merits;
}

async function getMeritsMissingInDb(merits: MeritPartial[]): Promise<MeritPartial[]> {
  const missingIds = await getManager().query(
    `SELECT
      t.date, t.amount, t.post_id, t.sender_uid
    FROM unnest($1::merit_key[]) as t(date, amount, post_id, sender_uid)
    LEFT JOIN
      merits m ON t.date = m.date AND t.amount = m.amount AND t.post_id = m.post_id AND t.sender_uid = m.sender_uid
    WHERE m.id IS NULL;`,
    [
      merits.map(
        merit =>
          `('${format(merit.date, 'yyyy-MM-dd HH:mm:ss')}', ${merit.amount}, ${merit.post_id}, ${merit.sender_uid})`,
      ),
    ],
  );

  const missingMerits = missingIds.map(value =>
    merits.find(
      merit =>
        isEqual(merit.date, value.date)
        && merit.amount === value.amount
        && merit.post_id === value.post_id
        && merit.sender_uid === value.sender_uid,
    ),
  );

  return missingMerits;
}

async function getPostsMissingInDb(merits: MeritPartial[]): Promise<Array<{ post_id: number; topic_id: number }>> {
  return getManager()
    .query(
      `SELECT DISTINCT t.id FROM unnest($1::integer[]) as t(id)
      LEFT JOIN posts p ON p.post_id = t.id WHERE p.post_id IS NULL;`,
      [merits.map(merit => merit.post_id)],
    )
    .then(values =>
      values.map((value: { id: number }) => ({
        post_id: value.id,
        topic_id: merits.find(merit => merit.post_id === value.id).topic_id,
      })),
    );
}

export async function scrapeMeritDump(shouldScrapeLoyce: boolean) {
  await createConnection();
  const postScraper = new PostScraper();
  const queue = new Queue(1);

  const startChunkPage = 0;
  const chunkSize = 100;

  const merits = await getListOfMerits(shouldScrapeLoyce);
  const chunks = Math.ceil(merits.length / chunkSize);

  console.log('got list of merits', merits.length);

  for await (const chunk of Array.from(Array.from({ length: chunks }), (_, i) => i).slice(startChunkPage)) {
    const paggedMerits = merits.slice(chunk * chunkSize, chunk * chunkSize + chunkSize);

    console.log(
      'chunk',
      chunk,
      'of',
      chunks - 1,
      'first: ',
      getUnixTime(paggedMerits[0].date),
      paggedMerits[0].topic_id,
      paggedMerits[0].post_id,
    );

    const meritsMissingInDb = await getMeritsMissingInDb(paggedMerits);

    const users = new Map<number, string>();

    meritsMissingInDb.forEach((merit) => {
      users.set(merit.receiver_uid, '');
      users.set(merit.sender_uid, '');
    });

    const postsMissingInDb = await getPostsMissingInDb(meritsMissingInDb);
    const postsInserted = [];

    const scrapePostsJob = postsMissingInDb.map(postMissing =>
      queue.add(async () => {
        const { post } = await postScraper.scrapePost(postMissing.post_id);

        if (!post) {
          throw new Error('Could not scrape post');
        }

        const queryResults = await createQueryBuilder()
          .insert()
          .into('posts')
          .values([post])
          .returning('post_id')
          .execute();

        postsInserted.push(...queryResults.generatedMaps);

        console.log('inserted', queryResults.generatedMaps.length, `(total of ${postsInserted.length})`);

        return queryResults;
      }),
    );

    await Promise.allSettled(scrapePostsJob);
    console.log('total posts inserted', postsInserted.length);

    const usersInPostsDb: Array<{
      author: string;
      author_uid: number;
      post_id: number;
      topic_id: number;
    }> = await getManager().query(
      `SELECT author, author_uid, post_id, topic_idFROM posts WHERE post_id = ANY($1::integer[]) AND topic_id = ANY($2::integer[]) ORDER BY date DESC;`,
      [meritsMissingInDb.map(merit => merit.post_id), meritsMissingInDb.map(merit => merit.topic_id)],
    );

    const usersInMeritsDb: Array<{
      receiver: string;
      receiver_uid: number;
      sender: string;
      sender_uid: number;
      post_id: number;
      topic_id: number;
    }> = await getManager().query(
      `SELECT receiver, receiver_uid, sender, sender_uid, post_id, topic_id FROM merits WHERE receiver_uid = ANY($1::integer[]) OR sender_uid = ANY($1::integer[]) ORDER BY date DESC;`,
      [meritsMissingInDb.flatMap(merit => [merit.receiver_uid, merit.sender_uid])],
    );

    usersInPostsDb.forEach((userInDb) => {
      users.set(userInDb.author_uid, userInDb.author);
    });

    usersInMeritsDb.forEach((userInDb) => {
      users.set(userInDb.receiver_uid, userInDb.receiver);
      users.set(userInDb.sender_uid, userInDb.sender);
    });

    (
      await Promise.all(
        Array.from(users.keys())
          .filter(userId => users.get(userId) === '')
          .map(async (userId) => {
            const username = await queue.add(async () => scrapeUserProfile(userId));
            return { username, userId };
          }),
      )
    ).forEach((user) => {
      if (user) {
        users.set(user.userId, user.username);
      }
    });

    const meritsRepository = container.resolve(MeritsRepository);

    const meritsToInsert = meritsMissingInDb
      .filter(
        merit =>
          users.has(merit.sender_uid)
          && users.has(merit.receiver_uid)
          && (!postsMissingInDb.find(post => post.post_id === merit.post_id)
            || postsInserted.find(post => post.post_id === merit.post_id)),
      )
      .map((merit) => {
        const sender = users.get(merit.sender_uid);
        const receiver = users.get(merit.receiver_uid);

        const createdMerit = meritsRepository.create({
          ...merit,
          sender,
          receiver,
          notified: false,
          notified_to: [],
          checked: false,
        });

        return createdMerit;
      });

    if (meritsToInsert.length) {
      const queryResults2 = await createQueryBuilder()
        .insert()
        .into('merits')
        .values(meritsToInsert)
        .onConflict('("date", "amount", "post_id", "sender_uid") DO NOTHING')
        .execute();

      console.log('merits inserted', queryResults2.generatedMaps.length);
    }
  }
}
