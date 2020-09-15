import { ApiResponse } from '@elastic/elasticsearch';

import Post from '../infra/typeorm/entities/Post';
import CreatePostDTO from '../dtos/CreatePostDTO';

import IFindPostsConditionsDTO from '../dtos/IFindPostsConditionsDTO';

export default interface IPostsRepository {
  create(data: CreatePostDTO): Post;
  save(post: Post): Promise<Post>;
  findOneByPostId(post_id: number): Promise<Post | undefined>;
  findLatestUncheckedPosts(limit: number): Promise<Post[]>;
  findPostsByTopicId(topic_id: number): Promise<ApiResponse>;
  findPostsByAuthor(author: string, limit: number): Promise<ApiResponse>;
  findPosts(
    conditions: IFindPostsConditionsDTO,
    limit: number,
    post_id_order?: 'ASC' | 'DESC',
  ): Promise<Post[]>;
  findPostsES(
    conditions: IFindPostsConditionsDTO,
    limit: number,
    post_id_order?: 'ASC' | 'DESC',
  ): Promise<ApiResponse>;
  findPostsFromList(posts_id: number[]): Promise<Post[]>;
  findPostsFromListES(posts_id: number[]): Promise<ApiResponse>;
}
