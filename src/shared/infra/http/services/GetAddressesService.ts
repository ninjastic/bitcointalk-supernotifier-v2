import { container } from 'tsyringe';

import esClient from '../../../services/elastic';

import IFindPostAddressesDTO from '../../../../modules/posts/dtos/IFindPostAddressesDTO';
import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';

export default class GetAddressesService {
  public async execute(conditions: IFindPostAddressesDTO): Promise<any> {
    const getBoardsList = container.resolve(GetBoardsListService);

    const {
      address,
      author,
      coin,
      post_id,
      topic_id,
      board,
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
      must.push({ match: { board_id: board } });
    }

    if (last) {
      must.push({
        range: {
          post_id: {
            lt: Number(last) ? last : null,
          },
        },
      });
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

    const data = results.body.hits.hits.map(raw => {
      const e = raw._source;

      return {
        address: e.address,
        coin: e.coin,
        post_id: e.post_id,
        topic_id: e.topic_id,
        author: e.author,
        author_uid: e.author_uid,
        title: e.title,
        content: e.content,
        date: e.date,
        board_id: e.board_id,
        board_name: boards.find(b => b.board_id === e.board_id)?.name || null,
      };
    });

    return {
      total_results: results.body.hits.total.value,
      addresses: data,
    };
  }
}
