import { container } from 'tsyringe';

import esClient from '../../../services/elastic';

import IFindPostAddressesDTO from '../../../../modules/posts/dtos/IFindPostAddressesDTO';
import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';
import GetBoardChildrensFromIdService from '../../../../modules/posts/services/GetBoardChildrensFromIdService';

interface Address {
  address: string;
  coin: 'BTC' | 'ETH';
  post_id: number;
  topic_id: number;
  author: string;
  author_uid: number;
  title: string;
  content: string;
  date: string;
  board_id: number;
  board_name: string;
}

interface Data {
  total_results: number;
  addresses: Address[];
}

export default class GetAddressesService {
  public async execute(conditions: IFindPostAddressesDTO): Promise<Data> {
    const getBoardsList = container.resolve(GetBoardsListService);

    const {
      address,
      author,
      coin,
      post_id,
      topic_id,
      board,
      child_boards,
      last,
      order,
      limit,
    } = conditions || {};

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
      if (child_boards && Number(child_boards) === 1) {
        const getBoardChildrensFromId = new GetBoardChildrensFromIdService();
        const boards = await getBoardChildrensFromId.execute(board);

        must.push({ terms: { board_id: boards } });
      } else {
        must.push({ terms: { board_id: [board] } });
      }
    }

    if (last && Number(last)) {
      must.push({ range: { post_id: { lt: last } } });
    }

    const results = await esClient.search({
      index: 'posts_addresses',
      track_total_hits: true,
      size: limit || 100,
      body: {
        query: {
          bool: {
            must,
          },
        },
        sort: [{ date: { order: order || 'DESC' } }],
      },
    });

    const boards = await getBoardsList.execute(true);

    const addresses = results.body.hits.hits.map(({ _source: record }) => {
      return {
        address: record.address,
        coin: record.coin,
        post_id: record.post_id,
        topic_id: record.topic_id,
        author: record.author,
        author_uid: record.author_uid,
        title: record.title,
        content: record.content,
        date: record.date,
        board_id: record.board_id,
        board_name:
          boards.find(b => b.board_id === record.board_id)?.name || null,
      };
    });

    const data = {
      total_results: results.body.hits.total.value,
      addresses,
    };

    return data;
  }
}
