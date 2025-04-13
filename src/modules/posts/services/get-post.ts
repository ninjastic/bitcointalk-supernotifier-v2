import { getRepository } from 'typeorm';
import { container } from 'tsyringe';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import Post from '##/modules/posts/infra/typeorm/entities/Post';
import { addForumScraperJob } from '##/shared/infra/bull/queues/forumScraperQueue';

type GetPostParams = {
  postId: number;
  shouldScrape: boolean;
  shouldCache: boolean;
};

const getPost = async (params: GetPostParams): Promise<Post | undefined> => {
  const postsRepository = getRepository(Post);
  const cacheRepository = container.resolve<RedisProvider>('CacheRepository');

  const cacheKey = `post:${params.postId}`;

  if (params.shouldCache) {
    const cachedPost = await cacheRepository.recover<Post>(cacheKey);

    if (cachedPost) {
      return cachedPost;
    }
  }

  let post: Post | undefined = await postsRepository.findOne({ where: { post_id: params.postId } });

  if (post) {
    return post;
  }

  if (params.shouldScrape) {
    const { post: scrapedPost } = await addForumScraperJob('scrapePost', { post_id: params.postId }, true);
    if (post) {
      post = scrapedPost;
    }
  }

  return post;
};

export default getPost;
