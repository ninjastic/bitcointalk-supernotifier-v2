/* eslint-disable no-await-in-loop */
import 'reflect-metadata';
import 'dotenv/config.js';
import { container } from 'tsyringe';
import { createConnection, getManager } from 'typeorm';
import cheerio from 'cheerio';
import validate from 'bitcoin-address-validation';

import '../../infra/typeorm';
import '../../container';

import PostAddress from '../../../modules/posts/infra/typeorm/entities/PostAddress';

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

    const operations = [];

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

          if (
            operations.findIndex(
              m => m.post_id === post.post_id && m.address === address,
            ) === -1
          ) {
            operations.push({
              post_id: post.post_id,
              coin: 'BTC',
              address,
            });
          }
        });
      }

      if (ethereumAddresses) {
        ethereumAddresses.forEach(address => {
          if (
            operations.findIndex(
              m => m.post_id === post.post_id && m.address === address,
            ) === -1
          ) {
            operations.push({
              post_id: post.post_id,
              coin: 'ETH',
              address,
            });
          }
        });
      }
    });

    const first = posts[0];
    const last = posts[posts.length - 1];

    if (operations.length === 0) {
      if (emptyOperations) {
        console.log('-- Finished --');
        stillHas = false;
        break;
      }

      emptyOperations = true;
    }

    const manager = getManager();

    if (operations.length) {
      await manager
        .createQueryBuilder()
        .insert()
        .into(PostAddress)
        .values(operations)
        .onConflict(`("address", "post_id") DO NOTHING`)
        .execute();
    }

    if (last) {
      await saveCache.execute('analysis:AddressesPostLastId', last.post_id);
      console.log(
        `Inserted ${operations.length}, first: ${first.post_id} last: ${last.post_id}`,
      );
    } else {
      console.log('nothing happened...');
    }
  }
});
