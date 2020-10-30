import { injectable, inject } from 'tsyringe';
import esClient from '../../../services/elastic';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';

interface Response {
  author: string;
  author_uid: number;
}

interface Params {
  author_uid: number;
}

@injectable()
export default class GetAuthorBaseDataService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute({ author_uid }: Params): Promise<Response> {
    const cachedData = await this.cacheRepository.recover<Response>(
      `authorBaseData:${author_uid}`,
    );

    if (cachedData) {
      return cachedData;
    }

    const results = await esClient.search({
      index: 'posts',
      track_total_hits: true,
      _source: ['author', 'author_uid'],
      size: 1,
      body: {
        query: {
          match: {
            author_uid: Number(author_uid),
          },
        },
      },
    });

    if (!results.body.hits.hits.length) {
      return null;
    }

    const data = {
      author: results.body.hits.hits[0]._source.author.toLowerCase(),
      author_uid: results.body.hits.hits[0]._source.author_uid,
    };

    await this.cacheRepository.save(
      `authorBaseData:${author_uid}`,
      data,
      'EX',
      604800,
    );

    return data;
  }
}
