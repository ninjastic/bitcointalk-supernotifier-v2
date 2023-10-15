import Post from '../infra/typeorm/entities/Post';

import ScrapePostDTO from '../dtos/ScrapePostDTO';

export type RecentPostWithFooter = {
  postElement: cheerio.Element;
  footerElement: cheerio.Element;
};

export default interface IScrapePostsRepository {
  scrapePost(data: ScrapePostDTO): Promise<Post | undefined>;
  scrapeTopic(topic_id: number): Promise<Post | undefined>;
  scrapeRecent(): Promise<number>;
  parseRecentPostElement(element: RecentPostWithFooter, currentDate: Date): Post;
}
