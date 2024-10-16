import { container } from 'tsyringe';
import esClient from '../../../services/elastic';

import IFindPostAddressesDTO from '../../../../modules/posts/dtos/IFindPostAddressesDTO';

import GetCacheService from '../../../container/providers/services/GetCacheService';
import SaveCacheService from '../../../container/providers/services/SaveCacheService';
import GetBoardChildrensFromIdService from '../../../../modules/posts/services/GetBoardChildrensFromIdService';
import { getCensorJSON } from '../../../services/utils';

interface Address {
  address: string;
  coin: 'BTC' | 'ETH';
  count: number;
}

interface Data {
  total_results: number;
  addresses: Address[];
}

export default class GetAddressesTopUniqueService {
  public async execute(conditions: IFindPostAddressesDTO): Promise<Data> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const { address, author, author_uid, coin, post_id, topic_id, board, child_boards, limit } = conditions || {};

    const cachedData = await getCache.execute<Data>(`users:AddressesTopUnique:${JSON.stringify(conditions)}`);

    if (cachedData) {
      return cachedData;
    }

    const must = [];
    const must_not = [];

    if (address) {
      must.push({ match: { address } });
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
        term: {
          'author.keyword': {
            value: author,
            case_insensitive: true
          }
        }
      });
    }

    if (author_uid) {
      must.push({ match: { author_uid } });
    }

    if (board) {
      if (child_boards && (child_boards === '1' || child_boards.toLowerCase() === 'true')) {
        const getBoardChildrensFromId = new GetBoardChildrensFromIdService();
        const boards = await getBoardChildrensFromId.execute(board);
        const boardsIdList = boards.map(_board => _board.board_id);

        must.push({ terms: { board_id: boardsIdList } });
      } else {
        must.push({ terms: { board_id: [board] } });
      }
    }

    const censor = getCensorJSON();
    if (censor && censor.postAddresses) {
      must_not.push({ terms: { address: censor.postAddresses } });
    }

    const results = await esClient.search({
      index: 'posts_addresses',
      track_total_hits: true,
      size: 0,
      query: {
        bool: {
          must,
          must_not
        }
      },
      aggs: {
        addresses: {
          terms: {
            field: 'address.keyword',
            size: Math.min(limit || 10, 100)
          },
          aggs: {
            coin: {
              top_hits: {
                size: 1,
                _source: {
                  includes: ['coin']
                }
              }
            }
          }
        }
      }
    });

    const addresses = (results.aggregations.addresses as any).buckets.map(record => ({
      address: record.key,
      coin: record.coin.hits.hits[0]._source.coin as 'BTC' | 'ETH',
      count: record.doc_count
    }));

    const data = {
      total_results: addresses.length,
      addresses
    };

    await saveCache.execute(`users:AddressesTopUnique:${JSON.stringify(conditions)}`, data, 'EX', 600);

    return data;
  }
}
