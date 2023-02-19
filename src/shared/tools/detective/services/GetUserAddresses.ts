import bodybuilder from 'bodybuilder';
import cheerio from 'cheerio';

import esClient from '../../../services/elastic';

import PostAddress from '../../../../modules/posts/infra/typeorm/entities/PostAddress';

interface AddressTypes {
  all: PostAddress[];
  direct_only: PostAddress[];
}

interface Data {
  addresses: AddressTypes;
  specified_boards: AddressTypes;
  specified_topics: AddressTypes;
}

interface Params {
  authorUid: number;
  boards?: number[];
  topics?: number[];
}

class GetUserAddresses {
  public async execute({ authorUid, boards = [], topics = [5273824] }: Params): Promise<Data> {
    const queryBuilder = bodybuilder();

    queryBuilder.query('match', 'author_uid', authorUid);
    const body = queryBuilder.build();

    const response = await esClient.search({
      index: 'posts_addresses',
      size: 5000,
      body
    });

    const addresses = response.body.hits.hits.map(raw => raw._source);
    const specified_topics = addresses.filter(entry => topics.includes(entry.topic_id));
    const specified_boards = addresses.filter(entry => boards.includes(entry.board_id));

    const data = {
      addresses: {
        all: addresses,
        direct_only: addresses.filter(entry => {
          const $ = cheerio.load(entry.content);
          const post = $('*');
          post.children('div.quoteheader').remove();
          post.children('div.quote').remove();

          const html = post.html();

          if (html.includes(entry.address)) {
            return true;
          }
          return false;
        })
      },
      specified_topics: {
        all: specified_topics,
        direct_only: specified_topics.filter(entry => {
          const $ = cheerio.load(entry.content);
          const post = $('*');
          post.children('div.quoteheader').remove();
          post.children('div.quote').remove();

          const html = post.html();

          if (html.includes(entry.address)) {
            return true;
          }
          return false;
        })
      },
      specified_boards: {
        all: specified_boards,
        direct_only: specified_boards.filter(entry => {
          const $ = cheerio.load(entry.content);
          const post = $('*');
          post.children('div.quoteheader').remove();
          post.children('div.quote').remove();

          const html = post.html();

          if (html.includes(entry.address)) {
            return true;
          }
          return false;
        })
      }
    };

    return data;
  }
}

export default GetUserAddresses;
