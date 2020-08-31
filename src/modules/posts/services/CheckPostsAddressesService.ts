import { inject, injectable, container } from 'tsyringe';
import { getManager } from 'typeorm';

import Address from '../infra/typeorm/entities/Address';

import IPostsRepository from '../repositories/IPostsRepository';
import IAddressesRepository from '../repositories/IAddressesRepository';
import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';

import ParsePostAddressesService from './ParsePostAddressesService';

@injectable()
export default class CheckPostsService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('AddressesRepository')
    private addressesRepository: IAddressesRepository,

    @inject('CacheRepository')
    private cacheProvider: ICacheProvider,
  ) {}

  public async execute(): Promise<void> {
    const parsePostAddresses = container.resolve(ParsePostAddressesService);

    let lastId = await this.cacheProvider.recover<number>(
      'checkPostsAddresses:lastId',
    );

    if (!lastId) {
      lastId = await this.addressesRepository.findLatestPostId();

      if (!lastId) {
        return;
      }
    }

    const posts = await this.postsRepository.findPosts({ after: lastId }, 200);

    const addressesGroup = await Promise.all(
      posts
        .map(post => {
          return parsePostAddresses.execute(post);
        })
        .filter(response => response.length),
    );

    const operations = [];

    addressesGroup.forEach(addressGroup =>
      addressGroup.forEach(address => {
        const foundIndex = operations.findIndex(
          o => o.address === address.address,
        );

        if (foundIndex === -1) {
          operations.push(address);
          return;
        }

        operations[foundIndex].posts_id = [
          ...operations[foundIndex].posts_id,
          ...address.posts_id,
        ];
      }),
    );

    if (operations.length) {
      await getManager()
        .createQueryBuilder()
        .insert()
        .into(Address)
        .values(operations)
        .onConflict(
          '("address") DO UPDATE SET posts_id = array(SELECT DISTINCT unnest(addresses.posts_id || excluded.posts_id))',
        )
        .execute();
    }

    const lastCheckedPostId = posts[0] ? posts[0].post_id : lastId;

    await this.cacheProvider.save(
      'checkPostsAddresses:lastId',
      lastCheckedPostId,
    );
  }
}
