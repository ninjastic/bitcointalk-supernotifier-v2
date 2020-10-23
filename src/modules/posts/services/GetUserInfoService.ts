import { container } from 'tsyringe';

import esClient from '../../../shared/services/elastic';

import GetCacheService from '../../../shared/container/providers/services/GetCacheService';
import SaveCacheService from '../../../shared/container/providers/services/SaveCacheService';
import GetAuthorInfoService from '../../../shared/infra/http/services/GetAuthorInfoService';

interface Data {
  author: string;
  author_uid: number;
  posts_count: number;
  other_usernames: string[];
}

export default class GetUserInfoService {
  public async execute({ username }: { username: string }): Promise<Data> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);
    const getAuthorInfo = container.resolve(GetAuthorInfoService);

    const cachedData = await getCache.execute<Data>(`userInfo:${username}`);

    if (cachedData) {
      return cachedData;
    }

    const authorInfo = await getAuthorInfo.execute({ username });

    const results = await esClient.search({
      index: 'posts',
      track_total_hits: true,
      _source: ['author', 'author_uid'],
      size: 1,
      body: {
        query: {
          match: {
            author_uid: authorInfo.author_uid,
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
      ...authorInfo,
      posts_count: results.body.hits.total.value,
    };

    await saveCache.execute(`userInfo:${username}`, data, 'EX', 180);

    return data;
  }
}
