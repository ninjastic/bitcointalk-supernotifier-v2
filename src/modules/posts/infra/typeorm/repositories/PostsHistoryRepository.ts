import { getRepository, MoreThanOrEqual, Repository } from 'typeorm';
import { sub } from 'date-fns';

import esClient from '../../../../../shared/services/elastic';

import PostHistory from '../entities/PostHistory';
import IPostsHistoryRepository from '../../../repositories/IPostsHistoryRepository';
import IFindOnePostHistoryDTO from '../../../dtos/IFindOnePostHistoryDTO';
import IFindAllPostsHistoryDTO from '../../../dtos/IFindAllPostsHistoryDTO';
import ICreatePostHistoryDTO from '../../../dtos/ICreatePostHistoryDTO';

import GetBoardChildrensFromIdService from '../../../services/GetBoardChildrensFromIdService';

export default class PostsHistoryRepository implements IPostsHistoryRepository {
  private ormRepository: Repository<PostHistory>;

  constructor() {
    this.ormRepository = getRepository(PostHistory);
  }

  public create(data: ICreatePostHistoryDTO): PostHistory {
    return this.ormRepository.create(data);
  }

  public async save(post: PostHistory): Promise<PostHistory> {
    return this.ormRepository.save(post);
  }

  public async findOne({ post_id, version }: IFindOnePostHistoryDTO): Promise<PostHistory | undefined> {
    return this.ormRepository.findOne({ post_id, version });
  }

  public async findLatestUncheckedPosts(limit?: number): Promise<PostHistory[]> {
    return this.ormRepository.find({
      where: {
        checked: false,
        deleted: false,
        date: MoreThanOrEqual(sub(new Date(), { minutes: 30 }))
      },
      order: { post_id: 'DESC' },
      take: limit,
      relations: ['post']
    });
  }

  public async findAll(conditions: IFindAllPostsHistoryDTO): Promise<any> {
    const { author, topic_id, deleted, board, after_date, before_date, last, limit } = conditions;

    const must = [];

    if (author) {
      must.push({
        match_phrase: {
          author: author.toLowerCase()
        }
      });
    }

    if (deleted) {
      must.push({ match: { deleted } });
    }

    if (topic_id) {
      must.push({ match: { topic_id } });
    }

    if (last) {
      must.push({ range: { created_at: { lt: last } } });
    }

    if (after_date || before_date) {
      must.push({
        range: { date: { gte: after_date || null, lte: before_date || null } }
      });
    }

    if (board) {
      const getBoardChildrensFromId = new GetBoardChildrensFromIdService();
      const boards = await getBoardChildrensFromId.execute(board);

      must.push({ terms: { board_id: boards } });
    }

    const results = await esClient.search({
      index: 'posts_history',
      track_total_hits: true,
      size: limit,
      body: {
        query: {
          bool: {
            must
          }
        },
        sort: [{ date: { order: 'DESC' } }]
      }
    });

    const posts_history = results.body.hits.hits.map(post => {
      const postData = post._source;

      return {
        post_id: postData.post_id,
        topic_id: postData.topic_id,
        author: postData.author,
        author_uid: postData.author_uid,
        title: postData.title,
        content: postData.content,
        date: postData.date,
        board_id: postData.board_id,
        deleted: postData.deleted,
        created_at: postData.created_at,
        updated_at: postData.updated_at
      };
    });

    const data = {
      total_results: results.body.hits.total.value,
      posts_history
    };

    return data;
  }
}
