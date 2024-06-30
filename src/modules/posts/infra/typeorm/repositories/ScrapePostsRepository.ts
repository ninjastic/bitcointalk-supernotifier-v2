import { container, inject, injectable } from 'tsyringe';
import { getManager } from 'typeorm';
import { addMinutes } from 'date-fns';

import IScrapePostsRepository, { RecentPostWithFooter } from '../../../repositories/IScrapePostsRepository';
import ICacheProvider from '../../../../../shared/container/providers/models/ICacheProvider';

import ScrapePostDTO from '../../../dtos/ScrapePostDTO';

import Post from '../entities/Post';

import ScrapePostService from '../../../services/ScrapePostService';
import ScrapeTopicService from '../../../services/ScrapeTopicService';
import ScrapeRecentPostsService from '../../../services/ScrapeRecentPostsService';
import ParseRecentPostElementService from '../../../services/ParseRecentPostElementService';
import TopicRepository from './TopicRepository';

@injectable()
export default class ScrapePostsRepository implements IScrapePostsRepository {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async scrapePost({ post_id }: ScrapePostDTO): Promise<Post | undefined> {
    const scrapePostService = container.resolve(ScrapePostService);

    const post = await scrapePostService.execute({ post_id });
    return post;
  }

  public async scrapeTopic(topic_id: number): Promise<Post | undefined> {
    const scrapeTopic = container.resolve(ScrapeTopicService);

    const post = await scrapeTopic.execute(topic_id);
    return post;
  }

  public async scrapeRecent(): Promise<number> {
    const topicRepository = container.resolve(TopicRepository);
    const scrapeRecent = container.resolve(ScrapeRecentPostsService);
    const posts = await scrapeRecent.execute();

    const valuesToRecover = posts.map(post => `post:${post.post_id}`);
    const cached = await this.cacheRepository.recoverMany<Post>(valuesToRecover);

    const operations = [];
    const valuesToAdd = [];

    for (const post of posts) {
      if (post.post_id && !cached.find(cache => cache && cache.post_id === post.post_id)) {
        operations.push(post);

        valuesToAdd.push({
          key: `post:${post.post_id}`,
          value: post,
          arg: 'EX',
          time: 300
        });
      }
    }

    if (!operations.length) {
      return 0;
    }

    const inserted = await getManager()
      .createQueryBuilder()
      .insert()
      .into(Post)
      .values(operations)
      .returning('*')
      .onConflict('("post_id") DO NOTHING')
      .execute();

    await this.cacheRepository.saveMany(valuesToAdd);

    if (inserted.raw.length) {
      const scrapeForChangesJobs = [];

      for await (const insertedPost of inserted.raw) {
        const dateUnix = addMinutes(new Date(), 5).getTime();

        scrapeForChangesJobs.push({
          key: `RescrapeForChanges:${dateUnix}:${insertedPost.post_id}`,
          value: {
            time: dateUnix,
            topic_id: insertedPost.topic_id,
            post_id: insertedPost.post_id
          },
          arg: 'EX',
          time: '1800'
        });

        const post = posts.find(_post => _post.post_id === insertedPost.post_id);

        if (post.topicAuthor === post.author && post.topicReplies === 0) {
          const topic = topicRepository.create({ post_id: post.post_id, topic_id: post.topic_id });
          await topicRepository.save(topic);
        }
      }

      await this.cacheRepository.saveMany(scrapeForChangesJobs);
    }

    return inserted.raw.length;
  }

  public parseRecentPostElement(element: RecentPostWithFooter, currentDate: Date): Post {
    const parseRecentPostElement = container.resolve(ParseRecentPostElementService);
    const post = parseRecentPostElement.execute(element, currentDate);
    return post;
  }
}
