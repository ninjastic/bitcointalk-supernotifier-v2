import { container, inject, injectable } from 'tsyringe';
import { isValid, addMinutes } from 'date-fns';

import ScrapePostDTO from '../dtos/ScrapePostDTO';

import IPostsHistoryRepository from '../repositories/IPostsHistoryRepository';

import ScrapePostService from './ScrapePostService';
import GetPostService from './GetPostService';

@injectable()
export default class ScrapePostForChangesService {
  constructor(
    @inject('PostsHistoryRepository')
    private postsHistoryRepository: IPostsHistoryRepository
  ) {}

  public async execute({ topic_id, post_id }: ScrapePostDTO): Promise<void> {
    const scrapePost = container.resolve(ScrapePostService);
    const getPost = container.resolve(GetPostService);

    const currentPost = await scrapePost.execute({ topic_id, post_id });
    const savedPost = await getPost.execute({ post_id }, { skipCache: true });

    if (!currentPost.title) {
      delete savedPost.created_at;
      delete savedPost.updated_at;

      const postHistory = this.postsHistoryRepository.create({
        ...savedPost,
        deleted: true,
        version: 1
      });
      await this.postsHistoryRepository.save(postHistory);
      return;
    }

    if (currentPost.content !== savedPost.content || currentPost.title !== savedPost.title) {
      const currentDate = new Date();

      const postHistory = this.postsHistoryRepository.create({
        ...currentPost,
        date: isValid(currentPost.edited)
          ? currentPost.edited
          : addMinutes(currentDate, currentDate.getTimezoneOffset()),
        version: 1
      });
      await this.postsHistoryRepository.save(postHistory);
    }
  }
}
