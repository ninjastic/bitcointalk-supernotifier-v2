import { inject, injectable } from 'tsyringe';

import IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class SetPostCheckedService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public async execute(post_id: number): Promise<void> {
    const post = await this.postsRepository.findOneByPostId(post_id);

    post.checked = true;

    await this.postsRepository.save(post);
  }
}
