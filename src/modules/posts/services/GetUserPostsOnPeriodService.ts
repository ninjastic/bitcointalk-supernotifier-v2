import { container } from 'tsyringe';

import esClient from '../../../shared/services/elastic';

import GetCacheService from '../../../shared/container/providers/services/GetCacheService';
import SaveCacheService from '../../../shared/container/providers/services/SaveCacheService';

interface Params {
  username: string;
  from: string;
  to: string;
  interval: string;
}

export default class GetUserPostsOnPeriodService {
  public async execute({ username, from, to, interval }: Params): Promise<any> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute<any>(
      `userPostsOnPeriod:${username}:${from}-${to}-${interval}`,
    );

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

    const results = await esClient.search({
      index: 'posts',
      scroll: '1m',
      _source: ['author', 'author_uid'],
      size: 1,
      body: {
        size: 1,
        _source: ['author', 'author_uid'],
        query: {
          bool: {
            must: [
              {
                match: {
                  author_uid:
                    dataUsername.body.hits.hits[0]?._source.author_uid,
                },
              },
              {
                range: {
                  date: {
                    from,
                    to,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          posts: {
            value_count: {
              field: 'post_id',
            },
          },
          date: {
            date_histogram: {
              field: 'date',
              fixed_interval: interval,
              extended_bounds: {
                min: from,
                max: to,
              },
            },
          },
        },
      },
    });

    const data = results.body.aggregations.date.buckets;

    await saveCache.execute(
      `userPostsOnPeriod:${username}:${from}-${to}-${interval}`,
      data,
      'EX',
      180,
    );

    return data;
  }
}
