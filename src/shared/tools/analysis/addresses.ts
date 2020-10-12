/* eslint-disable no-await-in-loop */
import 'reflect-metadata';
import 'dotenv/config.js';
import { container } from 'tsyringe';
import { createConnection, getManager } from 'typeorm';
import cheerio from 'cheerio';
import validate from 'bitcoin-address-validation';

import '../../infra/typeorm';
import '../../container';

import Address from '../../../modules/posts/infra/typeorm/entities/Address';

import GetPostsService from '../../../modules/posts/services/GetPostsService';
import SaveCacheService from '../../container/providers/services/SaveCacheService';
import GetCacheService from '../../container/providers/services/GetCacheService';

createConnection().then(async () => {
  const getPosts = container.resolve(GetPostsService);
  const saveCache = container.resolve(SaveCacheService);
  const getCache = container.resolve(GetCacheService);

  const bitcoinRegex = new RegExp(
    '(bc(0([ac-hj-np-z02-9]{39}|[ac-hj-np-z02-9]{59})|1[ac-hj-np-z02-9]{8,87})|[13][a-km-zA-HJ-NP-Z1-9]{25,35})',
    'g',
  );
  const ethereumRegex = new RegExp('0x[a-fA-F0-9]{40}', 'g');

  let stillHas = true;
  let emptyOperations = false;

  while (await stillHas) {
    const lastPostId = await getCache.execute<number>(
      'analysis:AddressesPostLastId',
    );

    const posts = await getPosts.execute({ last: lastPostId, limit: 100000 });

    const matched = [];
    const authors = [];
    const authors_uid = [];

    posts.forEach(post => {
      const $ = cheerio.load(post.content);
      const data = $('body');
      data.children('div.quoteheader').remove();
      data.children('div.quote').remove();
      data.find('br').replaceWith('&nbsp;');
      const contentWithoutQuotes = data.text().replace(/\s\s+/g, ' ').trim();

      const bitcoinAddresses = contentWithoutQuotes.match(bitcoinRegex);
      const ethereumAddresses = contentWithoutQuotes.match(ethereumRegex);

      if (bitcoinAddresses) {
        bitcoinAddresses.forEach(address => {
          try {
            if (!validate(address)) return;
          } catch (error) {
            return;
          }

          if (matched[address] && matched[address].length) {
            if (matched[address].findIndex(a => a === post.post_id) === -1) {
              matched[address].push(post.post_id);
              authors[address].push(post.author);
              authors_uid[address].push(post.author_uid);
            }
          } else {
            matched[address] = [post.post_id];
            authors[address] = [post.author];
            authors_uid[address] = [post.author_uid];
          }
        });
      }

      if (ethereumAddresses) {
        ethereumAddresses.forEach(address => {
          if (matched[address] && matched[address].length) {
            if (matched[address].findIndex(a => a === post.post_id) === -1) {
              matched[address].push(post.post_id);
              authors[address].push(post.author);
              authors_uid[address].push(post.author_uid);
            }
          } else {
            matched[address] = [post.post_id];
            authors[address] = [post.author];
            authors_uid[address] = [post.author_uid];
          }
        });
      }
    });

    const last = posts[posts.length - 1];

    const operations = [];

    for (const match in matched) {
      if (matched[match]) {
        operations.push({
          address: match,
          coin: match.startsWith('0x') ? 'ETH' : 'BTC',
          posts_id: matched[match],
          authors: authors[match],
          authors_uid: authors_uid[match],
        });
      }
    }

    if (operations.length === 0) {
      if (emptyOperations) {
        console.log('-- Finished --');
        stillHas = false;
        break;
      }

      emptyOperations = true;
    }

    const manager = getManager();

    await manager
      .createQueryBuilder()
      .insert()
      .into(Address)
      .values(operations)
      .onConflict(
        `("address") DO UPDATE SET posts_id = array(SELECT DISTINCT unnest(addresses.posts_id || excluded.posts_id)),
          authors = array(SELECT DISTINCT unnest(addresses.authors || excluded.authors)),
          authors_uid = array(SELECT DISTINCT unnest(addresses.authors_uid || excluded.authors_uid))`,
      )
      .execute();

    await saveCache.execute('analysis:AddressesPostLastId', last.post_id);

    console.log(`Inserted ${operations.length}, last: ${last.post_id}`);
  }
});
