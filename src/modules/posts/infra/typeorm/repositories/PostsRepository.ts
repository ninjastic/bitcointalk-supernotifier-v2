import { Repository, MoreThanOrEqual, getRepository } from 'typeorm';
import { sub } from 'date-fns';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

import esClient from '../../../../../shared/services/elastic';
import { getCensorJSON } from '../../../../../shared/services/utils';

import Post from '../entities/Post';

import IPostsRepository, { PostFromES } from '../../../repositories/IPostsRepository';

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

  public async findLatestUncheckedPosts(limit?: number): Promise<Post[]> {
    return this.ormRepository.find({
      where: {
        checked: false,
        archive: false,
        date: MoreThanOrEqual(sub(new Date(), { minutes: 30 }))
      },
      order: { post_id: 'DESC' },
      take: limit
    });
  }

  public async findPostsByTopicId(topic_id: number): Promise<SearchResponse<PostFromES>> {
    const results = await esClient.search<PostFromES>({
      index: 'posts',
      track_total_hits: true,
      query: {
        match: {
          topic_id
        }
      },
      sort: [{ date: { order: 'desc' } }]
    });

    return results;
  }

  public async findPostsByAuthor(author: string, limit: number): Promise<SearchResponse<PostFromES>> {
    const actual_limit = Math.min(limit || 20, 200);
    const censor = getCensorJSON();

    const results = await esClient.search<PostFromES>({
      index: 'posts',
      scroll: '1m',
      size: actual_limit,
      query: {
        bool: {
          must: [
            {
              match: {
                author
              }
            }
          ],
          must_not: [
            {
              terms: {
                post_id: censor.postIds ?? []
              }
            },
            {
              terms: {
                topic_id: censor.topicIds ?? []
              }
            }
          ]
        }
      },
      sort: [{ date: { order: 'desc' } }]
    });

    return results;
  }

  public async findPostsES(conditions: IFindPostsConditionsDTO): Promise<SearchResponse<PostFromES>> {
    const {
      author,
      author_uid,
      content,
      title,
      topic_id,
      board,
      child_boards,
      last,
      after,
      after_date,
      before_date,
      limit,
      order
    } = conditions;
    const must = [];
    const must_not = [];

    if (author) {
      must.push({
        term: {
          author: {
            value: author,
            case_insensitive: true
          }
        }
      });
    }

    if (author_uid) {
      must.push({
        match: {
          author_uid
        }
      });
    }

    if (content) {
      must.push({
        simple_query_string: {
          fields: ['content'],
          query: content,
          default_operator: 'AND'
        }
      });
    }

    if (title) {
      must.push({
        simple_query_string: {
          fields: ['title'],
          query: title,
          default_operator: 'AND'
        }
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
            lt: Number(last) ? last : null
          }
        }
      });
    }

    if (after_date || before_date) {
      must.push({
        range: { date: { gte: after_date || null, lte: before_date || null } }
      });
    }

    if (board) {
      if (child_boards && (child_boards === '1' || child_boards.toLowerCase() === 'true')) {
        const getBoardChildrensFromId = new GetBoardChildrensFromIdService();
        const boards = await getBoardChildrensFromId.execute(board);
        const boardsIdList = boards.map(_board => _board.board_id);

        must.push({ terms: { board_id: boardsIdList } });
      } else {
        must.push({ terms: { board_id: [board] } });
      }
    }

    const censor = getCensorJSON();
    if (censor && censor.postIds) {
      must_not.push({ terms: { post_id: censor.postIds } });
    }

    if (censor && censor.topicIds) {
      must_not.push({ terms: { topic_id: censor.topicIds } });
    }

    const results = await esClient.search<PostFromES>({
      index: 'posts',
      track_total_hits: true,
      size: limit,
      query: {
        bool: {
          must,
          must_not
        }
      },
      sort: [{ date: { order: (order as 'asc' | 'desc') || 'desc' } }]
    });

    return results;
  }

  public async findPosts(conditions: IFindPostsConditionsDTO): Promise<Post[]> {
    const { author, author_uid, topic_id, last, after, after_date, before_date, board, limit, order } = conditions;

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
        'posts.board_id',
        'posts.archive'
      ])
      .where(author ? `lower(author) = :author` : '1=1', {
        author: author
          ? {
              value: author,
              case_insensitive: true
            }
          : undefined
      })
      .andWhere(author_uid ? `author_uid = :author_uid` : '1=1', {
        author_uid
      })
      .andWhere(last ? `post_id < :last` : '1=1', {
        last
      })
      .andWhere(after ? `post_id > :after` : '1=1', {
        after
      })
      .andWhere(board ? `board_id = :board` : '1=1', { board })
      .andWhere(topic_id ? `topic_id = :topic_id` : '1=1', { topic_id })
      .andWhere(after_date ? `date >= :after_date` : '1=1', {
        after_date
      })
      .andWhere(before_date ? `date <= :before_date` : '1=1', {
        before_date
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
        ids: `{${ids}}`
      })
      .execute();
  }

  public async findPostsFromListES(ids: number[]): Promise<any> {
    const censor = getCensorJSON();

    const results = await esClient.search<Post>({
      index: 'posts',
      track_total_hits: true,
      size: ids.length,
      query: {
        bool: {
          must: [
            {
              terms: {
                post_id: ids
              }
            }
          ],
          must_not: [
            {
              terms: {
                post_id: censor.postIds ?? []
              }
            },
            {
              terms: {
                topic_id: censor.topicIds ?? []
              }
            }
          ]
        }
      },
      sort: [{ date: { order: 'desc' } }]
    });

    const data = results.hits.hits.map(post => {
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
        updated_at: postData.updated_at
      };
    });

    return data;
  }
}
