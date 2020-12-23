import { injectable, inject } from 'tsyringe';
import esClient from '../../../services/elastic';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';

interface Response {
  author_uid: number;
}

interface Params {
  username: string;
}

@injectable()
export default class GetAuthorUIDFromUsernameService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute({ username }: Params): Promise<Response> {
    const cachedData = await this.cacheRepository.recover<Response>(
      `authorUID:${username}`,
    );

    if (cachedData) {
      return cachedData;
    }

    const author = await esClient.search({
      index: 'posts',
      _source: ['author', 'author_uid'],
      size: 1,
      body: {
        query: {
          match_phrase: {
            author: username,
          },
        },
      },
    });

    if (!author.body.hits.hits.length) {
      return null;
    }

    const data = {
      author_uid: author.body.hits.hits[0]?._source.author_uid,
    };

    await this.cacheRepository.save(`authorUID:${username}`, data);

    return data;
  }
}
