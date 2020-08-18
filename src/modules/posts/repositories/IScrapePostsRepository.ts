import Post from '../infra/typeorm/entities/Post';

import ScrapePostDTO from '../dtos/ScrapePostDTO';

export default interface IScrapePostsRepository {
  scrapePost(data: ScrapePostDTO): Promise<Post>;
  scrapeRecent(): Promise<void>;
  parseRecentPostElement(element: CheerioElement): Post;
}
