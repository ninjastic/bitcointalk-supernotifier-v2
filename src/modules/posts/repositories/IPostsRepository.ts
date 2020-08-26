import Post from '../infra/typeorm/entities/Post';
import CreatePostDTO from '../dtos/CreatePostDTO';

interface IFindPostsConditions {
  author?: string;
  content?: string;
}

export default interface IPostsRepository {
  create(data: CreatePostDTO): Post;
  save(post: Post): Promise<Post>;
  findOneByPostId(post_id: number): Promise<Post>;
  findLatestUncheckedPosts(limit: number): Promise<Post[]>;
  findPostsFromTopicId(topic_id: number): Promise<Post[]>;
  findPostsByContent(search: string, limit: number): Promise<Post[]>;
  findPostsByAuthor(author: string, limit: number): Promise<Post[]>;
  findPosts(conditions: IFindPostsConditions, limit: number): Promise<Post[]>;
}
