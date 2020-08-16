import Post from '../infra/schemas/Post';

import ScrapePostDTO from '../dtos/ScrapePostDTO';

export default interface IScrapePostsRepository {
  scrapePost(data: ScrapePostDTO): Promise<Post>;
  scrapeRecent(): Promise<void>;
  parseRecentPostElement(element: CheerioElement): Post;
}
