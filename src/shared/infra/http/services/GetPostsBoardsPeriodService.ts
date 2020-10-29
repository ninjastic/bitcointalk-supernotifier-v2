import esClient from '../../../services/elastic';

interface Params {
  from?: string;
  to?: string;
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
  public async execute({ from, to }: Params): Promise<Data[]> {
    const dataRaw = await esClient.search({
      index: 'posts',
      size: 0,
      track_total_hits: true,
      body: {
        query: {
          bool: {
            must: [
              {
                range: {
                  date: {
                    gte: from,
                    lte: to,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          boards: {
            terms: {
              field: 'board_id',
              size: 10,
            },
            aggs: {
              date: {
                date_histogram: {
                  field: 'date',
                  fixed_interval: '1h',
                  extended_bounds: {
                    min: from,
                    max: to,
                  },
                },
              },
            },
          },
        },
      },
    });

    const data = dataRaw.body.aggregations.boards.buckets.map(board => {
      return {
        board_id: board.key,
        timestamps: board.date.buckets,
      };
    });

    return data;
  }
}