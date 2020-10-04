import { Repository, MoreThanOrEqual, getRepository } from 'typeorm';
import { sub, isValid } from 'date-fns';
import { ApiResponse } from '@elastic/elasticsearch';

import esClient from '../../../../../shared/services/elastic';

import Post from '../entities/Post';

import IPostsRepository from '../../../repositories/IPostsRepository';

import CreatePostDTO from '../../../dtos/CreatePostDTO';
import IFindPostsConditionsDTO from '../../../dtos/IFindPostsConditionsDTO';

import GetBoardChildrensFromIdService from '../../../services/GetBoardChildrensFromIdService';

export default class PostsRepository implements IPostsRepository {
  private ormRepository: Repository<Post>;

  constructor() {
    this.ormRepository = getRepository(Post);
  }

  public create(data: CreatePostDTO): Post {
    return this.ormRepository.create(data);
  }

  public async save(post: Post): Promise<Post> {
    const postSaved = await this.ormRepository.save(post);

    return postSaved;
  }

  public async findOneByPostId(post_id: number): Promise<Post | undefined> {
    return this.ormRepository.findOne({ post_id });
  }

  public async findLatestUncheckedPosts(limit: number): Promise<Post[]> {
    return this.ormRepository.find({
      where: {
        checked: false,
        archive: false,
        date: MoreThanOrEqual(sub(new Date(), { minutes: 30 })),
      },
      order: { post_id: 'DESC' },
      take: limit,
    });
  }

  public async findPostsByTopicId(topic_id: number): Promise<ApiResponse> {
    const results = await esClient.search<Post>({
      index: 'posts',
      scroll: '1m',
      size: 5000,
      body: {
        query: {
          match: {
            topic_id,
          },
        },
        sort: [{ date: { order: 'DESC' } }],
      },
    });

    return results;
  }

  public async findPostsByAuthor(
    author: string,
    limit: number,
  ): Promise<ApiResponse> {
    const actual_limit = Math.min(limit || 20, 200);

    const results = await esClient.search<Post>({
      index: 'posts',
      scroll: '1m',
      size: actual_limit,
      body: {
        query: {
          term: {
            'author.keyword': {
              value: author,
            },
          },
        },
        sort: [{ date: { order: 'DESC' } }],
      },
    });

    return results;
  }

  public async findPostsES(
    conditions: IFindPostsConditionsDTO,
    limit: number,
    post_id_order?: 'ASC' | 'DESC',
  ): Promise<ApiResponse<Post>> {
    const {
      author,
      content,
      topic_id,
      last,
      after,
      board,
      after_date,
      before_date,
    } = conditions;

    const must = [];

    if (author) {
      must.push({
        term: {
          'author.keyword': {
            value: author,
          },
        },
      });
    }

    if (content) {
      must.push({
        match_phrase_prefix: {
          content: { query: content },
        },
      });
    }

    if (topic_id) {
      if (Number.isNaN(topic_id)) {
        throw new Error('topic_id is invalid');
      }

      must.push({ match: { topic_id } });
    }

    if (last || after) {
      if (last && Number.isNaN(last)) {
        throw new Error('last is invalid');
      }

      if (after && Number.isNaN(after)) {
        throw new Error('after is invalid');
      }

      must.push({ range: { post_id: { gt: after, lt: last } } });
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

    const results = await esClient.search<Post>({
      index: 'posts',
      scroll: '1m',
      size: limit,
      body: {
        query: {
          bool: {
            must,
          },
        },
        sort: [{ date: { order: post_id_order || 'DESC' } }],
      },
    });

    return results;
  }

  public async findPosts(
    conditions: IFindPostsConditionsDTO,
    limit: number,
    post_id_order?: 'ASC' | 'DESC',
  ): Promise<Post[]> {
    const {
      author,
      topic_id,
      last,
      after,
      after_date,
      before_date,
    } = conditions;

    return this.ormRepository
      .createQueryBuilder('posts')
      .select([
        'posts.post_id',
        'posts.topic_id',
        'posts.title',
        'posts.author',
        'posts.author_uid',
        'posts.content',
        'posts.date',
        'posts.boards',
        'posts.archive',
      ])
      .where(author ? `lower(author) = :author` : '1=1', {
        author: author ? author.toLowerCase() : undefined,
      })
      .andWhere(last ? `post_id < :last` : '1=1', {
        last,
      })
      .andWhere(after ? `post_id > :after` : '1=1', {
        after,
      })
      .andWhere(topic_id ? `topic_id = :topic_id` : '1=1', { topic_id })
      .andWhere(after_date ? `date >= :after_date` : '1=1', {
        after_date,
      })
      .andWhere(before_date ? `date <= :before_date` : '1=1', {
        before_date,
      })
      .addOrderBy('post_id', post_id_order || 'DESC')
      .limit(limit)
      .getMany();
  }

  public async findPostsFromList(posts_id: number[]): Promise<Post[]> {
    const ids = posts_id.reduce((prev, current, i, array) => {
      if (i === 0) {
        return current;
      }
      if (i === array.length - 1) {
        return `${prev},${current}`;
      }
      return `${prev},${current}`;
    }, '');

    return this.ormRepository
      .createQueryBuilder('posts')
      .select(['*'])
      .where(`posts.post_id = any(:ids::int4[])`, {
        ids: `{${ids}}`,
      })
      .execute();
  }

  public async findPostsFromListES(posts_id: number[]): Promise<ApiResponse> {
    const ids = [];

    posts_id.forEach(post_id => {
      ids.push(post_id);
    });

    const results = await esClient.search({
      index: 'posts',
      scroll: '1m',
      size: ids.length,
      body: {
        query: {
          terms: {
            post_id: ids,
          },
        },
        sort: [{ date: { order: 'DESC' } }],
      },
    });

    return results;
  }
}
