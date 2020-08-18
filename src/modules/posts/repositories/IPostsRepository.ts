import Post from '../infra/typeorm/entities/Post';
import CreatePostDTO from '../dtos/CreatePostDTO';

export default interface IPostsRepository {
  create(data: CreatePostDTO): Post;
  save(post: Post): Promise<Post>;
  findByPostId(id: number): Promise<Post>;
  getLatestUncheckedPosts(limit: number): Promise<Post[]>;
}
