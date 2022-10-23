import { container } from 'tsyringe';
import bodybuilder from 'bodybuilder';

import esClient from '../../../services/elastic';

import GetBoardChildrensFromIdService from '../../../../modules/posts/services/GetBoardChildrensFromIdService';
import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';

export interface IFindMeritsService {
  post_id?: number;
  topic_id?: number;
  receiver?: number;
  receiver_uid?: number;
  sender?: number;
  sender_uid?: number;
  amount?: number;
  board?: number;
  child_boards?: string;
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

    if (query.receiver) {
      queryBuilder.addQuery('match_phrase', 'receiver', query.receiver);
    }

    if (query.sender) {
      queryBuilder.addQuery('match_phrase', 'sender', query.sender);
    }

    if (query.after_date) {
      queryBuilder.query('range', {
        date: {
          gte: query.after_date,
        },
      });
    }

    if (query.before_date) {
      queryBuilder.query('range', {
        date: {
          lte: query.before_date,
        },
      });
    }

    if (query.board) {
      if (
        query.child_boards === '1' ||
        query.child_boards?.toLowerCase() === 'true'
      ) {
        const getBoardChildrensFromId = new GetBoardChildrensFromIdService();
        const boards = await getBoardChildrensFromId.execute(query.board);

        queryBuilder.query('terms', 'board_id', boards);
      } else {
        queryBuilder.query('terms', 'board_id', [query.board]);
      }
    }

    const simpleMatchParams = [
      'post_id',
      'topic_id',
      'receiver_uid',
      'sender_uid',
      'amount',
    ];

    simpleMatchParams.forEach(param => {
      if (query[param]) {
        queryBuilder.addQuery('match', param, query[param]);
      }
    });

    if (query.limit) {
      queryBuilder.size(Math.min(query.limit, 1000));
    }

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
      delete meritData.checked;
      delete meritData.notified;

      return meritData;
    });

    const response = {
      total_results: results.body.hits.total.value,
      merits: data,
    };

    return response;
  }
}
