import { load } from 'cheerio';
import validate from 'bitcoin-address-validation';

import Address from '../infra/typeorm/entities/Address';
import Post from '../infra/typeorm/entities/Post';
import { validateTronAddress } from '../../../shared/services/utils';

export default class ParsePostAddressesService {
  public execute(post: Post): Address[] {
    const bitcoinRegex =
      /(bc(0([ac-hj-np-z02-9]{39}|[ac-hj-np-z02-9]{59})|1[ac-hj-np-z02-9]{8,87})|[13][a-km-zA-HJ-NP-Z1-9]{25,35})/g;
    const ethereumRegex = /0x[a-fA-F0-9]{40}/g;
    const tronRegex = /\bT[A-Za-z1-9]{33}\b/g;

    const $ = load(post.content);
    const data = $('body');
    data.children('div.quoteheader').remove();
    data.children('div.quote').remove();
    data.find('br').replaceWith('&nbsp;');
    const contentWithoutQuotes = data.text().replace(/\s\s+/g, ' ').trim();

    const bitcoinAddresses = contentWithoutQuotes.match(bitcoinRegex);
    const ethereumAddresses = contentWithoutQuotes.match(ethereumRegex);
    const tronAddresses = contentWithoutQuotes.match(tronRegex);

    const addresses = [];

    if (bitcoinAddresses) {
      bitcoinAddresses.forEach(address => {
        try {
          if (!validate(address)) return;
        } catch (error) {
          return;
        }

        if (addresses.findIndex(m => m.post_id === post.post_id && m.address === address) === -1) {
          addresses.push({
            post_id: post.post_id,
            coin: 'BTC',
            address
          });
        }
      });
    }

    if (ethereumAddresses) {
      ethereumAddresses.forEach(address => {
        if (addresses.findIndex(m => m.post_id === post.post_id && m.address === address) === -1) {
          addresses.push({
            post_id: post.post_id,
            coin: 'ETH',
            address
          });
        }
      });
    }

    if (tronAddresses) {
      tronAddresses.forEach(address => {
        if (!validateTronAddress(address)) {
          return;
        }
        if (addresses.findIndex(m => m.post_id === post.post_id && m.address === address) === -1) {
          addresses.push({
            post_id: post.post_id,
            coin: 'TRX',
            address
          });
        }
      });
    }

    return addresses;
  }
}
