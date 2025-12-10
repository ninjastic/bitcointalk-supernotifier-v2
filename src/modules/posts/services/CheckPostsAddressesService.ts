import { inject, injectable } from 'tsyringe';
import { getManager } from 'typeorm';

import type ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import type IPostsAddressesRepository from '../repositories/IPostsAddressesRepository';
import type IPostsRepository from '../repositories/IPostsRepository';

import PostAddress from '../infra/typeorm/entities/PostAddress';
import ParsePostAddressesService from './ParsePostAddressesService';

@injectable()
export default class CheckPostsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('PostsAddressesRepository')
    private postsAddressesRepository: IPostsAddressesRepository,

    @inject('CacheRepository')
    private cacheProvider: ICacheProvider,
  ) {}

  public async execute(): Promise<void> {
    const parsePostAddresses = new ParsePostAddressesService();

    let lastId = await this.cacheProvider.recover<number>('checkPostsAddresses:lastId');

    if (!lastId) {
      const last = await this.postsAddressesRepository.findOne({
        order: 'desc',
      });
      lastId = last?.post_id;
    }

    const posts = await this.postsRepository.findPosts({
      after: lastId || 0,
      limit: 150,
      order: 'ASC',
    });

    const addressesGroup = await Promise.all(
      posts.map(post => parsePostAddresses.execute(post)).filter(response => response.length),
    );

    const operations = [];

    addressesGroup.forEach(addressGroup =>
      addressGroup.forEach((address) => {
        operations.push(address);
      }),
    );

    if (operations.length) {
      await getManager()
        .createQueryBuilder()
        .insert()
        .into(PostAddress)
        .values(operations)
        .onConflict('("address", "post_id") DO NOTHING')
        .execute();
    }

    const lastCheckedPostId = posts.length ? posts[posts.length - 1].post_id : lastId;

    await this.cacheProvider.save('checkPostsAddresses:lastId', lastCheckedPostId);
  }
}
