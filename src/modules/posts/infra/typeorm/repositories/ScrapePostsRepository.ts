import { container, inject, injectable } from 'tsyringe';
import { getManager } from 'typeorm';

import IScrapePostsRepository from '../../../repositories/IScrapePostsRepository';
import ICacheProvider from '../../../../../shared/container/providers/models/ICacheProvider';

import ScrapePostDTO from '../../../dtos/ScrapePostDTO';

import Post from '../entities/Post';

import ScrapePostService from '../../../services/ScrapePostService';
import ScrapeTopicService from '../../../services/ScrapeTopicService';
import ScrapeRecentPostsService from '../../../services/ScrapeRecentPostsService';
import ParseRecentPostElementService from '../../../services/ParseRecentPostElementService';

@injectable()
export default class ScrapePostsRepository implements IScrapePostsRepository {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async scrapePost({
    topic_id,
    post_id,
  }: ScrapePostDTO): Promise<Post | undefined> {
    const scrapePostService = container.resolve(ScrapePostService);

    const post = await scrapePostService.execute({ topic_id, post_id });

    return post;
  }

  public async scrapeTopic(topic_id: number): Promise<Post | undefined> {
    const scrapeTopic = container.resolve(ScrapeTopicService);

    const post = await scrapeTopic.execute(topic_id);

    return post;
  }

  public async scrapeRecent(): Promise<void> {
    const scrapeRecent = container.resolve(ScrapeRecentPostsService);

    const posts = await scrapeRecent.execute();

    const valuesToRecover = posts.map(post => {
      return `post:${post.post_id}`;
    });

    const cached = await this.cacheRepository.recoverMany<Post>(
      valuesToRecover,
    );

    const operations = [];

    posts.forEach(post => {
      if (!post.post_id) return;

      if (!cached.find(cache => cache && cache.post_id === post.post_id)) {
        operations.push(post);
      }
    });

    if (!operations.length) {
      return;
    }

    await getManager()
      .createQueryBuilder()
      .insert()
      .into(Post)
      .values(operations)
      .returning('*')
      .onConflict('("post_id") DO NOTHING')
      .execute();

    const valuesToSet = [];

    posts.forEach((post: Post) => {
      if (!post.post_id) return;

      valuesToSet.push({
        key: `post:${post.post_id}`,
        value: post,
        arg: 'EX',
        time: 300,
      });
    });

    await this.cacheRepository.saveMany(valuesToSet);
  }

  public parseRecentPostElement(element: CheerioElement): Post {
    const parseRecentPostElement = container.resolve(
      ParseRecentPostElementService,
    );

    const post = parseRecentPostElement.execute(element);

    return post;
  }
}
