import { container } from 'tsyringe';

import esClient from '../../../services/elastic';

import GetCacheService from '../../../container/providers/services/GetCacheService';
import SaveCacheService from '../../../container/providers/services/SaveCacheService';
import GetAuthorBaseDataService from './GetAuthorBaseDataService';
import type Post from '../../../../modules/posts/infra/typeorm/entities/Post';

interface Data {
  author: string;
  author_uid: number;
  posts_count: number;
}

interface Params {
  author_uid: number;
}

export default class GetUserDataService {
  public async execute({ author_uid }: Params): Promise<Data> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);
    const getAuthorBaseData = container.resolve(GetAuthorBaseDataService);

    const cachedData = await getCache.execute<Data>(`userData:${author_uid}`);

    if (cachedData) {
      return cachedData;
    }

    const authorInfo = await getAuthorBaseData.execute({ author_uid });

    if (!authorInfo) {
      return null;
    }

    const results = await esClient.search<Post>({
      index: 'posts',
      track_total_hits: true,
      _source: ['author', 'author_uid'],
      size: 1,
      query: {
        match: {
          author_uid: authorInfo.author_uid
        }
      },
      aggs: {
        posts: {
          value_count: {
            field: 'post_id'
          }
        },
        usernames: {
          terms: {
            field: 'author',
            size: 10
          }
        }
      }
    });

    const data = {
      ...authorInfo,
      ...results.hits.hits[0]?._source,
      posts_count: (results.hits.total as { value: number }).value
    };

    await saveCache.execute(`userData:${author_uid}`, data, 'EX', 180);

    return data;
  }
}
