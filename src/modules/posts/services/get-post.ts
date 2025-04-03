import { getRepository } from 'typeorm';
import { container } from 'tsyringe';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import Post from '##/modules/posts/infra/typeorm/entities/Post';
import scrapePostJob from '##/modules/posts/infra/jobs/scrape-post-job';

type GetPostParams = {
  postId: number;
  shouldScrape: boolean;
  shouldCache: boolean;
};

const getPost = async (params: GetPostParams): Promise<Post | undefined> => {
  const postsRepository = getRepository(Post);
  const cacheRepository = container.resolve(RedisProvider);

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
    const { post: scrapedPost } = await scrapePostJob(params.postId);
    if (post) {
      post = scrapedPost;
    }
  }

  return post;
};

export default getPost;
