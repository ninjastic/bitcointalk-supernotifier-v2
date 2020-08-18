import { getRepository, Repository, MoreThanOrEqual } from 'typeorm';
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

  public async findByPostId(id: number): Promise<Post> {
    const post = await this.ormRepository.findOne({ post_id: id });

    return post;
  }

  public async getLatestUncheckedPosts(limit: number): Promise<Post[]> {
    const posts = await this.ormRepository.find({
      where: {
        checked: false,
        archive: false,
        date: MoreThanOrEqual(sub(new Date(), { minutes: 30 })),
      },
      order: { created_at: -1 },
      take: limit,
    });

    return posts;
  }
}
