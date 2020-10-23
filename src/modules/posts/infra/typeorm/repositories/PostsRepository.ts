import { Repository, MoreThanOrEqual, getRepository } from 'typeorm';
import { sub } from 'date-fns';
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
      track_total_hits: true,
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
          match: {
            author,
          },
        },
        sort: [{ date: { order: 'DESC' } }],
      },
    });

    return results;
  }

  public async findPostsES(
    conditions: IFindPostsConditionsDTO,
  ): Promise<ApiResponse<Post>> {
    const {
      author,
      author_uid,
      content,
      topic_id,
      board,
      child_boards,
      last,
      after,
      after_date,
      before_date,
      limit,
      order,
    } = conditions;

    const must = [];

    if (author) {
      must.push({
        match: {
          author,
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
      if (child_boards) {
        const getBoardChildrensFromId = new GetBoardChildrensFromIdService();
        const boards = await getBoardChildrensFromId.execute(board);

        must.push({ terms: { board_id: boards } });
      } else {
        must.push({ terms: { board_id: [board] } });
      }
    }

    const results = await esClient.search<Post>({
      index: 'posts',
      track_total_hits: true,
      size: limit,
      body: {
        query: {
          bool: {
            must,
          },
        },
        sort: [{ date: { order: order || 'DESC' } }],
      },
    });

    return results;
  }

  public async findPosts(conditions: IFindPostsConditionsDTO): Promise<Post[]> {
    const {
      author,
      topic_id,
      last,
      after,
      after_date,
      before_date,
      limit,
      order,
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
      .addOrderBy('post_id', order || 'DESC')
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

  public async findPostsFromListES(ids: number[]): Promise<any> {
    const results = await esClient.search({
      index: 'posts',
      track_total_hits: true,
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

    const data = results.body.hits.hits.map(post => {
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
        archive: postData.archive,
        created_at: postData.created_at,
        updated_at: postData.updated_at,
      };
    });

    return data;
  }
}
