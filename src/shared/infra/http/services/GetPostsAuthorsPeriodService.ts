import esClient from '../../../services/elastic';

interface Params {
  from?: string;
  to?: string;
}

interface Data {
  author: string;
  timestamps: Array<{
    key_as_string: string;
    key: number;
    doc_count: number;
  }>;
}

export default class GetPostsAuthorsPeriodService {
  public async execute({ from, to }: Params): Promise<Data[]> {
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
        authors: {
          terms: {
            field: 'author.keyword',
            size: 10
          },
          aggs: {
            date: {
              date_histogram: {
                field: 'date',
                calendar_interval: '1h',
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

    const data = (dataRaw.aggregations.authors as any).buckets.map(author => ({
      author: author.key,
      timestamps: author.date.buckets
    }));

    return data;
  }
}
