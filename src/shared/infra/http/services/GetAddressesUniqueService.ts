import esClient from '../../../services/elastic';

import IFindPostAddressesDTO from '../../../../modules/posts/dtos/IFindPostAddressesDTO';
import GetBoardChildrensFromIdService from '../../../../modules/posts/services/GetBoardChildrensFromIdService';

interface Address {
  address: string;
  coin: 'BTC' | 'ETH';
  count: number;
}

interface Data {
  after_key: string;
  addresses: Address[];
}

export default class GetAddressesUniqueService {
  public async execute(conditions: IFindPostAddressesDTO): Promise<Data> {
    const {
      address,
      addresses,
      author,
      coin,
      post_id,
      topic_id,
      board,
      child_boards,
      last,
      limit,
    } = conditions || {};

    const must = [];

    if (address) {
      must.push({ match: { address } });
    } else if (addresses) {
      must.push({ terms: { address: addresses } });
    }

    if (coin) {
      must.push({ match: { coin } });
    }

    if (post_id) {
      must.push({ match: { post_id } });
    }

    if (topic_id) {
      must.push({ match: { topic_id } });
    }

    if (author) {
      must.push({
        match_phrase: {
          author: author.toLowerCase(),
        },
      });
    }

    if (board) {
      if (
        child_boards &&
        (child_boards === '1' || child_boards.toLowerCase() === 'true')
      ) {
        const getBoardChildrensFromId = new GetBoardChildrensFromIdService();
        const boards = await getBoardChildrensFromId.execute(board);

        must.push({ terms: { board_id: boards } });
      } else {
        must.push({ terms: { board_id: [board] } });
      }
    }

    const actual_limit = Math.min(limit || 10, 50);

    const results = await esClient.search({
      index: 'posts_addresses',
      track_total_hits: true,
      size: 0,
      body: {
        query: {
          bool: {
            must,
          },
        },
        aggs: {
          addresses: {
            composite: {
              size: actual_limit,
              sources: [
                {
                  address: {
                    terms: {
                      field: 'address.keyword',
                    },
                  },
                },
              ],
              after: {
                address: last || '',
              },
            },
            aggs: {
              authors: {
                terms: {
                  field: 'author.keyword',
                  size: 100,
                },
              },
              coin: {
                top_hits: {
                  size: 1,
                  _source: ['coin'],
                },
              },
            },
          },
        },
      },
    });

    const data_addresses = results.body.aggregations.addresses.buckets.map(
      record => {
        return {
          address: record.key.address,
          coin: record.coin.hits.hits[0]._source.coin as 'BTC' | 'ETH',
          count: record.doc_count,
          authors: record.authors.buckets,
        };
      },
    );

    const data = {
      after_key:
        data_addresses.length < actual_limit
          ? null
          : results.body.aggregations.addresses.after_key.address,
      addresses: data_addresses,
    };

    return data;
  }
}
