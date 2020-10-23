import esClient from '../../../services/elastic';

import IFindPostAddressesDTO from '../../../../modules/posts/dtos/IFindPostAddressesDTO';

export default class GetAddressesAuthorsService {
  public async execute(query: IFindPostAddressesDTO): Promise<any> {
    const { address, author, coin, post_id, topic_id, board } = query || {};

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
      must.push({ match: { author } });
    }

    if (board) {
      must.push({ match: { board_id: board } });
    }

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
          authors: {
            terms: {
              field: 'author.keyword',
              size: 2000,
            },
            aggs: {
              author_uid: {
                terms: {
                  field: 'author_uid',
                },
              },
            },
          },
        },
      },
    });

    const authors = results.body.aggregations.authors.buckets.map(record => {
      return {
        author: record.key,
        author_uid: record.author_uid.buckets[0].key,
        count: record.doc_count,
      };
    });

    const response = {
      total_results: results.body.hits.total.value,
      authors,
    };

    return response;
  }
}
