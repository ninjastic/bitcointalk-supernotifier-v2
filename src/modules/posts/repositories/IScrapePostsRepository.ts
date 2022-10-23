import Post from '../infra/typeorm/entities/Post';

import ScrapePostDTO from '../dtos/ScrapePostDTO';

export default interface IScrapePostsRepository {
  scrapePost(data: ScrapePostDTO): Promise<Post | undefined>;
  scrapeTopic(topic_id: number): Promise<Post | undefined>;
  scrapeRecent(): Promise<void>;
  parseRecentPostElement(element: cheerio.Element): Post;
}
