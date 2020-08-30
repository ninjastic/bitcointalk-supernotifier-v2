import Post from '../infra/typeorm/entities/Post';
import CreatePostDTO from '../dtos/CreatePostDTO';

import IFindPostsConditionsDTO from '../dtos/IFindPostsConditionsDTO';

export default interface IPostsRepository {
  create(data: CreatePostDTO): Post;
  save(post: Post): Promise<Post>;
  findOneByPostId(post_id: number): Promise<Post | undefined>;
  findLatestUncheckedPosts(limit: number): Promise<Post[]>;
  findPostsFromTopicId(topic_id: number): Promise<Post[]>;
  findPostsByContent(search: string, limit: number): Promise<Post[]>;
  findPostsByAuthor(author: string, limit: number): Promise<Post[]>;
  findPosts(
    conditions: IFindPostsConditionsDTO,
    limit: number,
  ): Promise<Post[]>;
  findPostsFromList(posts_id: number[]): Promise<Post[]>;
}
