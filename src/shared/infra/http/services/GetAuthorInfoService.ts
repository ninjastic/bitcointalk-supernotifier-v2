import { injectable, inject } from 'tsyringe';
import esClient from '../../../services/elastic';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';

interface Response {
  author: string;
  author_uid: number;
  other_usernames: string[];
}

interface Params {
  username: string;
}

@injectable()
export default class GetAuthorUsernamesService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute({ username }: Params): Promise<Response> {
    const cachedData = await this.cacheRepository.recover<Response>(
      `user:${username}:usernames`,
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
          match: {
            author: username,
          },
        },
      },
    });

    if (!author.body.hits.hits.length) {
      return null;
    }

    const results = await esClient.search({
      index: 'posts',
      track_total_hits: true,
      _source: ['author', 'author_uid'],
      size: 1,
      body: {
        query: {
          match: {
            author_uid: author.body.hits.hits[0]?._source.author_uid,
          },
        },
        aggs: {
          usernames: {
            terms: {
              field: 'author.keyword',
              size: 10,
            },
          },
        },
      },
    });

    const data = {
      author: results.body.aggregations.usernames.buckets.filter(record => {
        return record.key.toLowerCase() === username.toLowerCase();
      })[0]?.key,
      author_uid: results.body.hits.hits[0]._source.author_uid,
      other_usernames: results.body.aggregations.usernames.buckets
        .filter(record => {
          return record.key.toLowerCase() !== username.toLowerCase();
        })
        .map(record => record.key),
    };

    await this.cacheRepository.save(
      `user:${username}:usernames`,
      data,
      'EX',
      604800,
    );

    return data;
  }
}
