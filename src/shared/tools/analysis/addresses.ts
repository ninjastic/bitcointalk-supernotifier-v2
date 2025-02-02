/* eslint-disable no-await-in-loop */
import 'reflect-metadata';
import 'dotenv/config';
import { container } from 'tsyringe';
import { createConnection, getManager, InsertResult } from 'typeorm';
import cheerio from 'cheerio';
import validate from 'bitcoin-address-validation';

import '../../container';

import PostAddress from '../../../modules/posts/infra/typeorm/entities/PostAddress';

import GetPostsService from '../../../modules/posts/services/GetPostsService';
import SaveCacheService from '../../container/providers/services/SaveCacheService';
import GetCacheService from '../../container/providers/services/GetCacheService';
import { validateTronAddress } from '../../services/utils';

createConnection().then(async () => {
  const getPosts = container.resolve(GetPostsService);
  const saveCache = container.resolve(SaveCacheService);
  const getCache = container.resolve(GetCacheService);

  const bitcoinRegex =
    /(bc(0([ac-hj-np-z02-9]{39}|[ac-hj-np-z02-9]{59})|1[ac-hj-np-z02-9]{8,87})|[13][a-km-zA-HJ-NP-Z1-9]{25,35})/g;
  const ethereumRegex = /0x[a-fA-F0-9]{40}/g;
  const tronRegex = /\bT[A-Za-z1-9]{33}\b/g;

  const limit = 100000;
  let stillHas = true;
  let startOver = false;
  const coins = ['TRX'];

  while (await stillHas) {
    const lastPostId = startOver ? null : await getCache.execute<number>('analysis:AddressesPostLastId');
    console.log('lastPostId', lastPostId);

    const posts = await getPosts.execute({ last: lastPostId, limit });

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
      const tronAddresses = contentWithoutQuotes.match(tronRegex);

      if (bitcoinAddresses && coins.includes('BTC')) {
        bitcoinAddresses.forEach(address => {
          try {
            if (!validate(address)) return;
          } catch (error) {
            return;
          }

          if (operations.findIndex(m => m.post_id === post.post_id && m.address === address) === -1) {
            operations.push({
              post_id: post.post_id,
              coin: 'BTC',
              address
            });
          }
        });
      }

      if (ethereumAddresses && coins.includes('ETH')) {
        ethereumAddresses.forEach(address => {
          if (operations.findIndex(m => m.post_id === post.post_id && m.address === address) === -1) {
            operations.push({
              post_id: post.post_id,
              coin: 'ETH',
              address
            });
          }
        });
      }

      if (tronAddresses && coins.includes('TRX')) {
        tronAddresses.forEach(address => {
          if (!validateTronAddress(address)) {
            return;
          }
          if (operations.findIndex(m => m.post_id === post.post_id && m.address === address) === -1) {
            operations.push({
              post_id: post.post_id,
              coin: 'TRX',
              address
            });
          }
        });
      }
    });

    const first = posts[0];
    const last = posts[posts.length - 1];

    const manager = getManager();
    let inserted = null as InsertResult;

    if (operations.length) {
      inserted = await manager
        .createQueryBuilder()
        .insert()
        .into(PostAddress)
        .values(operations)
        .onConflict(`("address", "post_id") DO NOTHING`)
        .execute();
    }

    if (operations.length === 0 && posts.length < limit) {
      console.log('-- Finished --');
      stillHas = false;
      break;
    }

    if (last && inserted) {
      console.log(`Inserted ${inserted.raw.length}, first: ${first.post_id} last: ${last.post_id}`);
    } else {
      console.log('Nothing was inserted...');
    }

    await saveCache.execute('analysis:AddressesPostLastId', last.post_id);

    if (startOver) {
      startOver = false;
    }
  }
});
