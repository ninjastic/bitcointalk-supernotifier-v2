import type { AggregationsCalendarInterval } from '@elastic/elasticsearch/lib/api/types';

import { container } from 'tsyringe';

import GetCacheService from '../../../container/providers/services/GetCacheService';
import SaveCacheService from '../../../container/providers/services/SaveCacheService';
import esClient from '../../../services/elastic';

export interface GetPostsCountPeriodParams {
  from: string;
  to: string;
  interval: AggregationsCalendarInterval;
}

interface Data {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export default class GetPostsCountPeriodService {
  public async execute({ from, to, interval }: GetPostsCountPeriodParams): Promise<Data[]> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute<Data[]>(`postsCountPeriod:${from}-${to}-${interval}`);

    if (cachedData) {
      return cachedData;
    }

    const results = await esClient.search({
      index: 'posts',
      track_total_hits: true,
      size: 0,
      query: {
        range: {
          date: {
            from,
            to,
          },
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
            calendar_interval: interval,
            extended_bounds: {
              min: from,
              max: to,
            },
          },
        },
      },
    });

    const data = (results.aggregations.date as any).buckets;

    await saveCache.execute(`postsCountPeriod:${from}-${to}-${interval}`, data, 'EX', 180);

    return data;
  }
}
