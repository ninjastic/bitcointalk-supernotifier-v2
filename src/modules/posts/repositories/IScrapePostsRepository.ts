import Post from '../infra/schemas/Post';

export default interface IScrapePostsRepository {
  scrapeRecent(): Promise<void>;
  scrapeRecentPostElement(element: CheerioElement): Post;
}
