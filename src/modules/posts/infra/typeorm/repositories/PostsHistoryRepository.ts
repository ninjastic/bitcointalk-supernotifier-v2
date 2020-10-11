import { getRepository, Repository } from 'typeorm';
import { isValid } from 'date-fns';
import { ApiResponse } from '@elastic/elasticsearch';

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

  public async findOne({
    post_id,
    version,
  }: IFindOnePostHistoryDTO): Promise<PostHistory | undefined> {
    return this.ormRepository.findOne({ post_id, version });
  }

  public async findLatestUncheckedPosts(limit: number): Promise<PostHistory[]> {
    return this.ormRepository.find({
      where: {
        checked: false,
        deleted: false,
      },
      order: { post_id: 'DESC' },
      take: limit,
      relations: ['post'],
    });
  }

  public async findAll(
    conditions: IFindAllPostsHistoryDTO,
  ): Promise<ApiResponse> {
    const {
      author,
      topic_id,
      deleted,
      board,
      after_date,
      before_date,
      last,
      limit,
    } = conditions;

    const must = [];

    if (author) {
      must.push({
        match: {
          author,
        },
      });
    }

    if (deleted !== undefined) {
      must.push({ match: { deleted } });
    }

    if (topic_id) {
      if (Number.isNaN(topic_id)) {
        throw new Error('topic_id is invalid');
      }

      must.push({ match: { topic_id } });
    }

    if (last) {
      if (!isValid(last)) {
        throw new Error('last is invalid');
      }

      must.push({ range: { created_at: { lt: last } } });
    }

    if (after_date || before_date) {
      if (after_date && !isValid(new Date(after_date))) {
        throw new Error('after_date is invalid');
      }

      if (before_date && !isValid(new Date(before_date))) {
        throw new Error('after_date is invalid');
      }

      must.push({ range: { date: { gte: after_date, lte: before_date } } });
    }

    if (board) {
      if (Number.isNaN(last)) {
        throw new Error('board is invalid');
      }

      const getBoardChildrensFromId = new GetBoardChildrensFromIdService();

      const boards = await getBoardChildrensFromId.execute(board);

      must.push({ terms: { board_id: boards } });
    }

    const results = await esClient.search<PostHistory>({
      index: 'posts_history',
      track_total_hits: true,
      size: limit,
      body: {
        query: {
          bool: {
            must,
          },
        },
        sort: [{ date: { order: 'DESC' } }],
      },
    });

    return results;
  }
}
