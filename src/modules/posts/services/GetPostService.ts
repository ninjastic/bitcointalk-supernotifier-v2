import { inject, injectable, container } from 'tsyringe';
import Queue from 'bull';

import cacheConfig from '../../../config/cache';

import Post from '../infra/typeorm/entities/Post';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IPostsRepository from '../repositories/IPostsRepository';

import ScrapePostService from './ScrapePostService';

interface Data {
  post_id: number;
  topic_id?: number;
}

interface Options {
  skipCache?: boolean;
  skipScraping?: boolean;
}

@injectable()
export default class GetPostService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(data: Data, options?: Options): Promise<Post> {
    const { post_id, topic_id } = data;
    const { skipCache, skipScraping } = options || {};

    if (!skipCache) {
      const cachedPost = await this.cacheRepository.recover<Post>(
        `post:${post_id}`,
      );

      if (cachedPost) {
        if (
          skipScraping ||
          (cachedPost.title !== '(Unknown Title)' && cachedPost.board_id)
        ) {
          return cachedPost;
        }
      }
    }

    const foundPost = await this.postsRepository.findOneByPostId(post_id);

    if (foundPost) {
      if (
        (foundPost.title === '(Unknown Title)' || !foundPost.board_id) &&
        !skipScraping
      ) {
        const scrapePost = container.resolve(ScrapePostService);

        const updatedPost = await scrapePost.execute({
          post_id: foundPost.post_id,
          topic_id: foundPost.topic_id,
        });

        if (updatedPost.title && updatedPost.date) {
          foundPost.title = updatedPost.title;
          foundPost.board_id = updatedPost.board_id;
          foundPost.date = updatedPost.date;
          foundPost.archive = false;

          await this.postsRepository.save(foundPost);
        }
      }

      await this.cacheRepository.save(
        `post:${foundPost.post_id}`,
        foundPost,
        'EX',
        300,
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
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
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
