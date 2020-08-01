import { container } from 'tsyringe';

import IScrapePostsRepository from '../../repositories/IScrapePostsRepository';

import Post from '../schemas/Post';

import ScrapeRecentPostService from '../../services/ScrapeRecentPostService';
import ScrapeRecentPostElementService from '../../services/ScrapeRecentPostElementService';
import SavePostService from '../../services/SavePostService';

export default class ScrapePostRepository implements IScrapePostsRepository {
  public async scrapeRecent(): Promise<void> {
    const scrapeRecent = container.resolve(ScrapeRecentPostService);
    const savePost = container.resolve(SavePostService);

    const posts = await scrapeRecent.execute();

    posts.forEach(async post => {
      await savePost.execute(post);
    });
  }

  public scrapeRecentPostElement(element: CheerioElement): Post {
    const scrapeRecentPostElement = container.resolve(
      ScrapeRecentPostElementService,
    );

    const post = scrapeRecentPostElement.execute(element);

    return post;
  }
}
