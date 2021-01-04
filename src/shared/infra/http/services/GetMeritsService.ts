import { container } from 'tsyringe';
import bodybuilder from 'bodybuilder';

import esClient from '../../../services/elastic';

import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';

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

interface Merit {
  post_id: number;
  topic_id: number;
  receiver: string;
  receiver_uid: number;
  sender: string;
  sender_uid: number;
  amount: number;
  title: string;
  date: string;
  board_id: number;
  board_name: string;
  created_at: string;
  updated_at: string;
}

interface Data {
  total_results: number;
  merits: Merit[];
}

export default class GetMeritsService {
  public async execute(query: IFindMeritsService): Promise<Data> {
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
              gte: query[key],
            },
          });
        case 'before_date':
          return queryBuilder.query('range', {
            date: {
              lte: query[key],
            },
          });
        case 'board_id':
          return queryBuilder.query('terms', key, query[key]);
        case 'limit':
          return queryBuilder.size(Math.max(query[key], 200));
        default:
          return queryBuilder.addQuery('match', key, query[key]);
      }
    });

    queryBuilder.sort('date', query.order || 'DESC');

    const body = queryBuilder.build();

    const results = await esClient.search({
      index: 'merits',
      track_total_hits: true,
      body,
    });

    const getBoardsList = container.resolve(GetBoardsListService);
    const boards = await getBoardsList.execute(true);

    const data = results.body.hits.hits.map(merit => {
      const boardName = boards.find(
        board => board.board_id === merit._source.board_id,
      )?.name;

      const meritData = { ...merit._source, board_name: boardName };

      delete meritData['@timestamp'];
      delete meritData['@version'];
      delete meritData.notified_to;

      return meritData;
    });

    const response = {
      total_results: results.body.hits.total.value,
      merits: data,
    };

    return response;
  }
}
