import { Repository, MoreThanOrEqual, getRepository } from 'typeorm';
import { sub } from 'date-fns';

import CreatePostDTO from '../../dtos/CreatePostDTO';

import Post from '../typeorm/entities/Post';
import IPostsRepository from '../../repositories/IPostsRepository';

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

  public async findOneByPostId(post_id: number): Promise<Post> {
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
        plainto_tsquery('simple', $1) ORDER BY post_id, date LIMIT $2;`,
      [search, actual_limit],
    );
  }
}
