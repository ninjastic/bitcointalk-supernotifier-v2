import type { estypes } from '@elastic/elasticsearch';

import { container } from 'tsyringe';

import GetCacheService from '##/platform/cache/providers/services/GetCacheService';
import SaveCacheService from '##/platform/cache/providers/services/SaveCacheService';
import esClient from '##/platform/elasticsearch/client';

interface Params {
  author_uid: number;
  from: string;
  to: string;
  type: string;
  interval: estypes.AggregationsCalendarInterval;
}

interface Date {
  key: number;
  transactions: number;
  total_sum: number;
}

interface Data {
  total_transactions: number;
  total_sum_merits: number;
  dates: Date[];
}

export default class GetUserMeritCountOnPeriodService {
  public async execute({ author_uid, from, to, type, interval }: Params): Promise<Data> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute<Data>(
      `meritsCountPeriod:${author_uid}:${from}-${to}-${type}-${interval}`,
    );

    if (cachedData) {
      return cachedData;
    }

    const results = await esClient.search({
      index: 'merits',
      track_total_hits: true,
      query: {
        bool: {
          must: [
            {
              match: {
                [type === 'receiver' ? 'receiver_uid' : 'sender_uid']: author_uid,
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
            field: 'id',
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
          aggs: {
            count: {
              sum: {
                field: 'amount',
              },
            },
          },
        },
        total_sum_merits: {
          sum_bucket: {
            buckets_path: 'date.count',
          },
        },
      },
    });

    const data = {
      total_transactions: (results.aggregations.merits as { value: number }).value,
      total_sum_merits: (results.aggregations.total_sum_merits as { value: number }).value,
      dates: (results.aggregations.date as any).buckets.map((b) => ({
        key: b.key,
        transactions: b.doc_count,
        total_sum: b.count.value,
      })),
    };

    await saveCache.execute(
      `meritsCountPeriod:${author_uid}:${from}-${to}-${type}-${interval}`,
      data,
      'EX',
      180,
    );

    return data;
  }
}
