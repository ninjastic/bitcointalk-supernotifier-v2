import { container } from 'tsyringe';

import IScrapePostsRepository from '../../../repositories/IScrapePostsRepository';
import ScrapePostDTO from '../../../dtos/ScrapePostDTO';

import Post from '../entities/Post';

import ScrapePostService from '../../../services/ScrapePostService';
import ScrapeTopicService from '../../../services/ScrapeTopicService';
import ScrapeRecentPostsService from '../../../services/ScrapeRecentPostsService';
import ParseRecentPostElementService from '../../../services/ParseRecentPostElementService';
import SavePostService from '../../../services/SavePostService';

export default class ScrapePostsRepository implements IScrapePostsRepository {
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
    const savePost = container.resolve(SavePostService);

    const posts = await scrapeRecent.execute();

    await Promise.all(
      posts.map(async post => {
        await savePost.execute(post);
      }),
    );
  }

  public parseRecentPostElement(element: CheerioElement): Post {
    const parseRecentPostElement = container.resolve(
      ParseRecentPostElementService,
    );

    const post = parseRecentPostElement.execute(element);

    return post;
  }
}
