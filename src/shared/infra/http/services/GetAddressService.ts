import { container } from 'tsyringe';

import esClient from '../../../services/elastic';

import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';

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

export default class GetAddressService {
  public async execute({ address }: { address: string }): Promise<Address[]> {
    const getBoardsList = container.resolve(GetBoardsListService);

    const results = await esClient.search({
      index: 'posts_addresses',
      track_total_hits: true,
      size: 100,
      body: {
        query: {
          match: {
            address,
          },
        },
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

    return data;
  }
}
