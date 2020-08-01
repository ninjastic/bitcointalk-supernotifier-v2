import Post from '../infra/schemas/Post';
import CreatePostDTO from '../dtos/CreatePostDTO';

export default interface IPostsRepository {
  create(data: CreatePostDTO): Post;
  save(post: Post): Promise<Post>;
  findByPostId(id: number): Promise<Post>;
}
