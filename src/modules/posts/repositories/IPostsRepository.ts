
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import Post from '../infra/typeorm/entities/Post';
import CreatePostDTO from '../dtos/CreatePostDTO';

import IFindPostsConditionsDTO from '../dtos/IFindPostsConditionsDTO';

export interface PostFromES {
  post_id: number;
  topic_id: number;
  author: string;
  author_uid: number;
  title: string;
  content: string;
  date: string;
  board_id: number;
  board_name?: string;
  archive: boolean;
  created_at: string;
  updated_at: string;
}

export default interface IPostsRepository {
  create(data: CreatePostDTO): Post;
  save(post: Post): Promise<Post>;
  findOneByPostId(post_id: number): Promise<Post | undefined>;
  findLatestUncheckedPosts(limit?: number): Promise<Post[]>;
  findPostsByTopicId(topic_id: number): Promise<SearchResponse<PostFromES>>;
  findPostsByAuthor(author: string, limit: number): Promise<SearchResponse<PostFromES>>;
  findPosts(conditions: IFindPostsConditionsDTO): Promise<Post[]>;
  findPostsES(conditions: IFindPostsConditionsDTO): Promise<SearchResponse<PostFromES>>;
  findPostsFromList(posts_id: number[]): Promise<Post[]>;
  findPostsFromListES(posts_id: number[]): Promise<any>;
}
