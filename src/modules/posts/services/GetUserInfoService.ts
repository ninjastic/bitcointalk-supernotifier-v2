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
  public async execute(username: string): Promise<Response> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute<Response>(`userInfo:${username}`);

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
            author: username,
          },
        },
        aggs: {
          posts: {
            value_count: {
              field: 'post_id',
            },
          },
        },
      },
    });

    const response = {
      timed_out: results.body.timed_out,
      result: 'success',
      data: results.body.hits.hits.length
        ? {
            author: results.body.hits.hits[0]._source.author,
            author_uid: results.body.hits.hits[0]._source.author_uid,
            posts_count: results.body.hits.total.value,
          }
        : null,
    };

    await saveCache.execute(`userInfo:${username}`, response, 'EX', 180);

    return response;
  }
}