import { AggregationsCalendarInterval } from '@elastic/elasticsearch/lib/api/types';
import esClient from '../../../services/elastic';

export interface GetPostsBoardsPeriodParams {
  from?: string;
  to?: string;
  interval?: AggregationsCalendarInterval;
  limit?: number;
}

interface Data {
  board_id: number;
  timestamps: Array<{
    key_as_string: string;
    key: number;
    doc_count: number;
  }>;
}

export default class GetPostsBoardsPeriodService {
  public async execute({ from, to, interval, limit }: GetPostsBoardsPeriodParams): Promise<Data[]> {
    const dataRaw = await esClient.search({
      index: 'posts',
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          must: [
            {
              range: {
                date: {
                  gte: from,
                  lte: to
                }
              }
            }
          ]
        }
      },
      aggs: {
        boards: {
          terms: {
            field: 'board_id',
            size: Math.min(limit || 10, 20)
          },
          aggs: {
            date: {
              date_histogram: {
                field: 'date',
                calendar_interval: interval,
                extended_bounds: {
                  min: from,
                  max: to
                }
              }
            }
          }
        }
      }
    });

    const data = (dataRaw.aggregations.boards as any).buckets.map(board => ({
      board_id: board.key,
      timestamps: board.date.buckets
    }));

    return data;
  }
}
