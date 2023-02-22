import { inject, injectable } from 'tsyringe';

import IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class SetPostNotifiedService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository
  ) {}

  public async execute(post_id: number, telegram_id: string): Promise<void> {
    const post = await this.postsRepository.findOneByPostId(post_id);

    post.notified = true;
    post.notified_to.push(telegram_id);

    await this.postsRepository.save(post);
  }
}
