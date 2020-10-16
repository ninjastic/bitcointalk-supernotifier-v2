import { container } from 'tsyringe';

import esClient from '../../../shared/services/elastic';

import GetCacheService from '../../../shared/container/providers/services/GetCacheService';
import SaveCacheService from '../../../shared/container/providers/services/SaveCacheService';

interface Data {
  author: string;
  author_uid: number;
  posts_count: number;
}

interface Response {
  timed_out: boolean;
  result: string;
  data: Data | null;
}

export default class GetUserInfoService {
  public async execute({ username }: { username: string }): Promise<any> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute<Response>(`userInfo:${username}`);

    if (cachedData) {
      return cachedData;
    }

    const dataUsername = await esClient.search({
      index: 'posts',
      track_total_hits: true,
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

    if (!dataUsername.body.hits.hits.length) {
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
            author_uid: dataUsername.body.hits.hits[0]?._source.author_uid,
          },
        },
        aggs: {
          posts: {
            value_count: {
              field: 'post_id',
            },
          },
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
      author: results.body.hits.hits[0]._source.author,
      author_uid: results.body.hits.hits[0]._source.author_uid,
      posts_count: results.body.hits.total.value,
      usernames: results.body.aggregations.usernames.buckets.map(u => u.key),
    };

    await saveCache.execute(`userInfo:${username}`, data, 'EX', 180);

    return data;
  }
}
