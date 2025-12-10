import type IFindPostsConditionsDTO from '../../../../modules/posts/dtos/IFindPostsConditionsDTO';

import GetBoardChildrensFromIdService from '../../../../modules/posts/services/GetBoardChildrensFromIdService';
import esClient from '../../../services/elastic';

interface Author {
  author: string;
  author_uid: number;
  count: number;
}

interface Data {
  total_results: number;
  authors: Author[];
}

export default class GetPostsAuthorsService {
  public async execute(query: IFindPostsConditionsDTO): Promise<Data> {
    const { author, author_uid, content, topic_id, board, child_boards, last, after, after_date, before_date, limit }
      = query || {};

    const must = [];

    if (author) {
      must.push({
        term: {
          author: {
            value: author,
            case_insensitive: true,
          },
        },
      });
    }

    if (author_uid) {
      must.push({
        match: {
          author_uid,
        },
      });
    }

    if (content) {
      must.push({
        match: {
          content: {
            query: content,
            minimum_should_match: '100%',
          },
        },
      });
    }

    if (topic_id) {
      must.push({ match: { topic_id } });
    }

    if (last || after) {
      must.push({
        range: {
          post_id: {
            gt: Number(after) ? after : null,
            lt: Number(last) ? last : null,
          },
        },
      });
    }

    if (after_date || before_date) {
      must.push({
        range: { date: { gte: after_date || null, lte: before_date || null } },
      });
    }

    if (board) {
      if (child_boards && (child_boards === '1' || child_boards.toLowerCase() === 'true')) {
        const getBoardChildrensFromId = new GetBoardChildrensFromIdService();
        const boards = await getBoardChildrensFromId.execute(board);
        const boardsIdList = boards.map(_board => _board.board_id);

        must.push({ terms: { board_id: boardsIdList } });
      }
      else {
        must.push({ terms: { board_id: [board] } });
      }
    }

    const results = await esClient.search({
      index: 'posts',
      track_total_hits: true,
      size: 0,
      query: {
        bool: {
          must,
        },
      },
      aggs: {
        authors: {
          terms: {
            field: 'author',
            size: Math.min(limit || 1000, 10000000),
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
    });

    const authors = (results.aggregations.authors as any).buckets.map(record => ({
      author: record.key,
      author_uid: record.author_uid.buckets[0].key,
      count: record.doc_count,
    }));

    const response = {
      total_results: authors.length,
      authors,
    };

    return response;
  }
}
