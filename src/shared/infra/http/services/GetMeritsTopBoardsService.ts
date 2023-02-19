import bodybuilder from 'bodybuilder';

import esClient from '../../../services/elastic';

export interface IFindMeritsService {
  post_id?: number;
  topic_id?: number;
  receiver?: number;
  receiver_uid?: number;
  sender?: number;
  sender_uid?: number;
  amount?: number;
  board_id?: number;
  after_date?: string;
  before_date?: string;
  order?: string;
  limit?: number;
}

interface Data {
  board_id: string;
  count: number;
}

export default class GetMeritsTopBoardsService {
  public async execute(query: IFindMeritsService): Promise<Data[]> {
    const queryBuilder = bodybuilder();

    Object.keys(query).forEach(key => {
      switch (key) {
        case 'receiver':
          return queryBuilder.addQuery('match_phrase', key, query[key]);
        case 'sender':
          return queryBuilder.addQuery('match_phrase', key, query[key]);
        case 'after_date':
          return queryBuilder.query('range', {
            date: {
              gte: query[key]
            }
          });
        case 'before_date':
          return queryBuilder.query('range', {
            date: {
              lte: query[key]
            }
          });
        case 'board_id':
          return queryBuilder.query('terms', key, query[key]);
        case 'limit':
          return null;
        default:
          return queryBuilder.addQuery('match', key, query[key]);
      }
    });

    queryBuilder.size(0);

    queryBuilder.aggregation('terms', 'board_id', { order: { count: 'desc' }, size: query.limit || 10 }, 'boards', a =>
      a.aggregation('sum', 'amount', 'count')
    );

    const body = queryBuilder.build();

    const results = await esClient.search({
      index: 'merits',
      track_total_hits: true,
      body
    });

    const data = results.body.aggregations.boards.buckets.map(b => ({
      board_id: b.key,
      count: b.count.value
    }));

    return data;
  }
}
