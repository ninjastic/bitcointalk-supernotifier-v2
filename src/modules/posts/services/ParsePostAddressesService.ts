import cheerio from 'cheerio';
import { inject, injectable } from 'tsyringe';
import validate from 'bitcoin-address-validation';

import Address from '../infra/typeorm/entities/Address';
import Post from '../infra/typeorm/entities/Post';

import IAddressesRepository from '../repositories/IAddressesRepository';

@injectable()
export default class ParsePostAddressesService {
  constructor(
    @inject('AddressesRepository')
    private addressesRepository: IAddressesRepository,
  ) {}

  public execute(post: Post): Address[] {
    const bitcoinRegex = new RegExp(
      '(bc(0([ac-hj-np-z02-9]{39}|[ac-hj-np-z02-9]{59})|1[ac-hj-np-z02-9]{8,87})|[13][a-km-zA-HJ-NP-Z1-9]{25,35})',
      'g',
    );
    const ethereumRegex = new RegExp('0x[a-fA-F0-9]{40}', 'g');

    const $ = cheerio.load(post.content);
    const data = $('body');
    data.children('div.quoteheader').remove();
    data.children('div.quote').remove();
    data.find('br').replaceWith('&nbsp;');
    const contentWithoutQuotes = data.text().replace(/\s\s+/g, ' ').trim();

    const bitcoinAddresses = contentWithoutQuotes.match(bitcoinRegex);
    const ethereumAddresses = contentWithoutQuotes.match(ethereumRegex);

    const matched = [];
    const addresses = [];

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
          }
        } else {
          matched[address] = [post.post_id];
        }
      });
    }

    if (ethereumAddresses) {
      ethereumAddresses.forEach(address => {
        if (matched[address] && matched[address].length) {
          if (matched[address].findIndex(a => a === post.post_id) === -1) {
            matched[address].push(post.post_id);
          }
        } else {
          matched[address] = [post.post_id];
        }
      });
    }

    for (const match in matched) {
      if (matched[match]) {
        const address = this.addressesRepository.create({
          address: match,
          coin: match.startsWith('0x') ? 'ETH' : 'BTC',
          posts_id: matched[match],
        });

        addresses.push(address);
      }
    }

    return addresses;
  }
}
