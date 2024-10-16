import { container } from 'tsyringe';
import { AggregationsCalendarInterval } from '@elastic/elasticsearch/lib/api/types';

import esClient from '../../../services/elastic';

import GetCacheService from '../../../container/providers/services/GetCacheService';
import SaveCacheService from '../../../container/providers/services/SaveCacheService';

interface Params {
  from: string;
  to: string;
  interval: AggregationsCalendarInterval;
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

export default class GetMeritsCountService {
  public async execute({ from, to, interval }: Params): Promise<Data> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute<Data>(`meritsCountPeriod:${from}-${to}-${interval}`);

    if (cachedData) {
      return cachedData;
    }

    const results = await esClient.search({
      index: 'merits',
      track_total_hits: true,
      size: 0,
      query: {
        range: {
          date: {
            from,
            to
          }
        }
      },
      aggs: {
        merits: {
          value_count: {
            field: 'id.keyword'
          }
        },
        date: {
          date_histogram: {
            field: 'date',
            calendar_interval: interval,
            extended_bounds: {
              min: from,
              max: to
            }
          },
          aggs: {
            count: {
              sum: {
                field: 'amount'
              }
            }
          }
        },
        total_sum_merits: {
          sum_bucket: {
            buckets_path: 'date.count'
          }
        }
      }
    });

    const data = {
      total_transactions: (results.aggregations.merits as { value: number }).value,
      total_sum_merits: (results.aggregations.total_sum_merits as { value: number }).value,
      dates: (results.aggregations.date as any).buckets.map(b => ({
        key: b.key,
        transactions: b.doc_count,
        total_sum: b.count.value
      }))
    };

    await saveCache.execute(`meritsCountPeriod:${from}-${to}-${interval}`, data, 'EX', 180);

    return data;
  }
}
