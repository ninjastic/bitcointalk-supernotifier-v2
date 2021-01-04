import { container } from 'tsyringe';

import esClient from '../../../shared/services/elastic';

import GetCacheService from '../../../shared/container/providers/services/GetCacheService';
import SaveCacheService from '../../../shared/container/providers/services/SaveCacheService';

interface Params {
  author_uid: number;
  from: string;
  to: string;
  type: string;
  interval: string;
}

interface Data {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export default class GetUserMeritCountOnPeriodService {
  public async execute({
    author_uid,
    from,
    to,
    type,
    interval,
  }: Params): Promise<Data[]> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute<Data[]>(
      `meritsCountPeriod:${author_uid}:${from}-${to}-${type}-${interval}`,
    );

    if (cachedData) {
      return cachedData;
    }

    const results = await esClient.search({
      index: 'merits',
      track_total_hits: true,
      body: {
        query: {
          bool: {
            must: [
              {
                match: {
                  [type === 'receiver'
                    ? 'receiver_uid'
                    : 'sender_uid']: author_uid,
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
          merits: {
            value_count: {
              field: '_id',
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
      },
    });

    const data = results.body.aggregations.date.buckets;

    await saveCache.execute(
      `meritsCountPeriod:${author_uid}:${from}-${to}-${type}-${interval}`,
      data,
      'EX',
      180,
    );

    return data;
  }
}
