import esClient from '../../../services/elastic';

import IFindPostAddressesDTO from '../../../../modules/posts/dtos/IFindPostAddressesDTO';

import GetBoardChildrensFromIdService from '../../../../modules/posts/services/GetBoardChildrensFromIdService';

interface Author {
  author: string;
  author_uid: number;
  count: number;
}

interface Data {
  total_results: number;
  authors: Author[];
}

export default class GetAddressesAuthorsService {
  public async execute(query: IFindPostAddressesDTO): Promise<Data> {
    const { address, author, coin, post_id, topic_id, board, child_boards, limit } = query || {};

    const must = [];

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
          author: {
            value: author,
            case_insensitive: true
          }
        }
      });
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

    const results = await esClient.search({
      index: 'posts_addresses',
      track_total_hits: true,
      size: 0,
      body: {
        query: {
          bool: {
            must
          }
        },
        aggs: {
          authors: {
            terms: {
              field: 'author.keyword',
              size: Math.min(limit || 1000, 10000000)
            },
            aggs: {
              author_uid: {
                terms: {
                  field: 'author_uid'
                }
              }
            }
          }
        }
      }
    });

    const authors = results.body.aggregations.authors.buckets.map(record => ({
      author: record.key,
      author_uid: record.author_uid.buckets[0].key,
      count: record.doc_count
    }));

    const response = {
      total_results: authors.length,
      authors
    };

    return response;
  }
}
