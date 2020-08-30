import { Repository, MoreThanOrEqual, getRepository } from 'typeorm';
import { sub } from 'date-fns';

import CreatePostDTO from '../../../dtos/CreatePostDTO';

import Post from '../entities/Post';
import IPostsRepository from '../../../repositories/IPostsRepository';

import IFindPostsConditionsDTO from '../../../dtos/IFindPostsConditionsDTO';

export default class PostsRepository implements IPostsRepository {
  private ormRepository: Repository<Post>;

  constructor() {
    this.ormRepository = getRepository(Post);
  }

  public create(data: CreatePostDTO): Post {
    const post = this.ormRepository.create(data);

    return post;
  }

  public async save(post: Post): Promise<Post> {
    const postSaved = await this.ormRepository.save(post);

    return postSaved;
  }

  public async findOneByPostId(post_id: number): Promise<Post | undefined> {
    const post = await this.ormRepository.findOne({ post_id });

    return post;
  }

  public async findLatestUncheckedPosts(limit: number): Promise<Post[]> {
    return this.ormRepository.find({
      where: {
        checked: false,
        archive: false,
        date: MoreThanOrEqual(sub(new Date(), { minutes: 30 })),
      },
      order: { created_at: -1 },
      take: limit,
    });
  }

  public async findPostsFromTopicId(topic_id: number): Promise<Post[]> {
    return this.ormRepository.find({
      where: {
        topic_id,
      },
    });
  }

  public async findPostsByContent(
    search: string,
    limit: number,
  ): Promise<Post[]> {
    const actual_limit = Math.min(limit || 20, 200);

    return this.ormRepository.query(
      `SELECT post_id, topic_id, title, author, author_uid, content, date,
        boards, archive FROM posts WHERE to_tsvector_forum_content(content) @@
        plainto_tsquery('simple', $1) ORDER BY post_id, date DESC LIMIT $2;`,
      [search, actual_limit],
    );
  }

  public async findPostsByAuthor(
    author: string,
    limit: number,
  ): Promise<Post[]> {
    const actual_limit = Math.min(limit || 20, 200);

    return this.ormRepository.query(
      `SELECT post_id, topic_id, title, author, author_uid, content, date,
        boards, archive FROM posts WHERE author = $1 ORDER BY post_id, date DESC LIMIT $2;`,
      [author, actual_limit],
    );
  }

  public async findPosts(
    conditions: IFindPostsConditionsDTO,
    limit: number,
  ): Promise<Post[]> {
    const { author, content, topic_id, last } = conditions;

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
      .andWhere(
        content
          ? `to_tsvector_forum_content(content) @@ plainto_tsquery('simple', :content)`
          : '1=1',
        { content: `'${content}'` },
      )
      .andWhere(author ? `lower(author) = :author` : '1=1', {
        author: author ? author.toLowerCase() : undefined,
      })
      .andWhere(last ? `post_id < :last` : '1=1', {
        last,
      })
      .andWhere(topic_id ? `topic_id = :topic_id` : '1=1', { topic_id })
      .addOrderBy('post_id', 'DESC')
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
}
