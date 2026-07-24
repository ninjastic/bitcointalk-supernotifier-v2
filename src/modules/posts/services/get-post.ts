import type RedisProvider from '##/platform/cache/providers/implementations/RedisProvider';

import Post from '##/modules/posts/infra/typeorm/entities/Post';
import Topic from '##/modules/posts/infra/typeorm/entities/Topic';
import { addForumScraperJob } from '##/platform/queues/forumScraperQueue';
import { container } from 'tsyringe';
import { getRepository } from 'typeorm';

interface GetPostParams {
  postId: number;
  shouldScrape: boolean;
  shouldCache: boolean;
}

async function getPost(params: GetPostParams): Promise<Post | undefined> {
  const postsRepository = getRepository(Post);
  const topicsRepository = getRepository(Topic);
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
    const { post: scrapedPost, topic: scrapedTopic } = await addForumScraperJob(
      'scrapePost',
      { post_id: params.postId },
      true,
    );
    if (scrapedPost) {
      post = scrapedPost;
      await postsRepository.save(scrapedPost);
    }
    if (scrapedTopic) {
      await topicsRepository.save(scrapedTopic);
    }
  }

  return post;
}

export default getPost;
