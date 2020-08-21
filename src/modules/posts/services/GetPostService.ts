import { inject, injectable } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import Post from '../infra/typeorm/entities/Post';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class GetPostService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(
    post_id: number,
    topic_id?: number,
    skipCache?: boolean,
  ): Promise<Post> {
    if (!skipCache) {
      const cachedPost = await this.cacheRepository.recover<Post>(
        `post:${post_id}`,
      );

      if (cachedPost) {
        return cachedPost;
      }
    }

    const foundPost = await this.postsRepository.findOneByPostId(post_id);

    if (foundPost) {
      await this.cacheRepository.save(
        `post:${foundPost.post_id}`,
        foundPost,
        'EX',
        180,
      );

      return foundPost;
    }

    if (!topic_id) {
      throw new Error(
        'The post does not exist in the DB and a topic_id has not been provided',
      );
    }

    const queue = new Queue('ForumScrapperSideQueue', {
      redis: cacheConfig.config.redis,
    });

    const job = await queue.add(
      'scrapePost',
      { topic_id, post_id },
      {
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    const jobResults = await job.finished();

    await queue.close();

    return jobResults;
  }
}
